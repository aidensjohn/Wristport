package com.wristport.java;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Shell-free Java ProcessBuilder runner for the real Samsung SDB executable.
 * Always passes explicit argument arrays (never invokes cmd.exe or /bin/sh).
 */
public final class SdbProcessRunner {

    public static final class ExecResult {
        public final boolean ok;
        public final int exitCode;
        public final String stdout;
        public final String stderr;
        public final String error;

        public ExecResult(boolean ok, int exitCode, String stdout, String stderr, String error) {
            this.ok = ok;
            this.exitCode = exitCode;
            this.stdout = stdout;
            this.stderr = stderr;
            this.error = error;
        }
    }

    public String detectBinaryFormat(Path binaryPath) {
        if (binaryPath == null || !Files.isRegularFile(binaryPath)) {
            return "missing";
        }
        try {
            byte[] header = new byte[4];
            int read;
            try (var in = Files.newInputStream(binaryPath)) {
                read = in.read(header);
            }
            if (read >= 2 && header[0] == 'M' && header[1] == 'Z') {
                return "pe-windows";
            }
            if (read >= 4 && header[0] == 0x7f && header[1] == 'E' && header[2] == 'L' && header[3] == 'F') {
                return "elf-linux";
            }
            if (read >= 4 && (
                (header[0] == (byte) 0xCF && header[1] == (byte) 0xFA && header[2] == (byte) 0xED && header[3] == (byte) 0xFE) ||
                (header[0] == (byte) 0xFE && header[1] == (byte) 0xED && header[2] == (byte) 0xFA && header[3] == (byte) 0xCE)
            )) {
                return "macho-macos";
            }
            return "unknown";
        } catch (IOException e) {
            return "unknown";
        }
    }

    public boolean isExecutableOnHost(String binaryFormat) {
        String os = System.getProperty("os.name", "").toLowerCase();
        if (os.contains("win")) {
            return "pe-windows".equals(binaryFormat);
        }
        if (os.contains("mac") || os.contains("darwin")) {
            return "macho-macos".equals(binaryFormat);
        }
        return "elf-linux".equals(binaryFormat);
    }

    public ExecResult execute(
            Path sdbBinary,
            List<String> args,
            long timeoutSeconds,
            Consumer<String> onStdoutLine
    ) {
        if (sdbBinary == null || !Files.isRegularFile(sdbBinary)) {
            return new ExecResult(false, -1, "", "", "No SDB executable found in workspace bin/ directory.");
        }

        List<String> command = new ArrayList<>();
        command.add(sdbBinary.toAbsolutePath().toString());
        command.addAll(args);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(sdbBinary.toAbsolutePath().getParent().toFile());

        try {
            Process process = pb.start();
            StringBuilder outBuf = new StringBuilder();
            StringBuilder errBuf = new StringBuilder();

            Thread outReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        outBuf.append(line).append('\n');
                        if (onStdoutLine != null && !line.isBlank()) {
                            onStdoutLine.accept(line);
                        }
                    }
                } catch (IOException ignored) {
                }
            }, "sdb-stdout-reader");

            Thread errReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        errBuf.append(line).append('\n');
                    }
                } catch (IOException ignored) {
                }
            }, "sdb-stderr-reader");

            outReader.start();
            errReader.start();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                outReader.join(500);
                errReader.join(500);
                return new ExecResult(false, -1, outBuf.toString().trim(), errBuf.toString().trim(),
                        "SDB command timed out after " + timeoutSeconds + "s");
            }

            outReader.join(1000);
            errReader.join(1000);
            int code = process.exitValue();
            return new ExecResult(code == 0, code, outBuf.toString().trim(), errBuf.toString().trim(), null);
        } catch (IOException e) {
            return new ExecResult(false, -1, "", "", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new ExecResult(false, -1, "", "", "Interrupted while executing SDB");
        }
    }
}
