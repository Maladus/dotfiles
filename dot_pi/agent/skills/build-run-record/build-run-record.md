# Build, Flash, Run & Record

All commands use `just` recipes defined in `@justfile`.

## Build

```bash
just build                    # incremental Debug build
just build Release            # incremental Release build
just build Debug full         # full (clean) Debug build
just rebuild                  # clean + build
```

## Flash

```bash
just local-flash              # flash Debug image via local FTDI
just remote-flash             # flash Debug image to remote host
```

## Run

```bash
just local-run                # run with default config (local FTDI)
just local-run-jtag           # run without reset (local FTDI)
just remote-run               # run on remote host
```

## Record with date stamp

```bash
# Short record (10 s) - local
DATE=$(date +%Y%m%d_%H%M%S) && just local-record 10 && \
  ls -t recordings/*.bin 2>/dev/null | head -1 | xargs -I{} mv {} "recordings/record_${DATE}.bin"

# Full record (60 s) - local
DATE=$(date +%Y%m%d_%H%M%S) && just local-record-full 60 && \
  ls -t recordings/*.bin 2>/dev/null | head -1 | xargs -I{} mv {} "recordings/record_${DATE}.bin"

# Record via JTAG (no reset) - local
DATE=$(date +%Y%m%d_%H%M%S) && just local-record-jtag 10 && \
  ls -t recordings/*.bin 2>/dev/null | head -1 | xargs -I{} mv {} "recordings/record_${DATE}.bin"

# Short record - remote
DATE=$(date +%Y%m%d_%H%M%S) && just remote-record 10 && \
  ls -t recordings/*.bin 2>/dev/null | head -1 | xargs -I{} mv {} "recordings/record_${DATE}.bin"

# Full record - remote
DATE=$(date +%Y%m%d_%H%M%S) && just remote-record-full 60 && \
  ls -t recordings/*.bin 2>/dev/null | head -1 | xargs -I{} mv {} "recordings/record_${DATE}.bin"
```

Or pass `--output` directly to radar-bridge:

```bash
DATE=$(date +%Y%m%d_%H%M%S)
. .env/bin/activate && ./radar-bridge --ftdi L1A10003 record \
    --skip-run --duration 10 \
    --config tests/ERD_64_S_ADC.cfg \
    --output "recordings/record_${DATE}.bin"
```

## Quick all-in-one: build + flash + record (local, Debug)

```bash
just build && just local-flash && \
  DATE=$(date +%Y%m%d_%H%M%S) && \
  . .env/bin/activate && ./radar-bridge --ftdi L1A10003 record \
      --duration 10 --config tests/ERD_64_S_ADC.cfg \
      --output "recordings/record_${DATE}.bin"
```

## Key variables (from justfile)

| Variable | Value |
|---|---|
| `local-ftdi-serial` | `L1A10003` |
| `remote-ip` | `192.168.42.94` |
| `default-config` | `tests/ERD_64_S_ADC.cfg` |
| `configuration` | `Debug` (default) or `Release` |
