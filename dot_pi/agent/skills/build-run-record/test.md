# Tests

All commands use `just` recipes defined in `@justfile`.

## Environment setup (run once)

```bash
just setup
```

## Run tests

```bash
just test                                         # all CI tests (unit + hardware + regression, automated, Debug)
just test automated Release                       # Release build
just test automated Debug "unit"                  # only unit tests
just test automated Debug "hardware"              # only hardware tests
just test automated Debug "regression"            # only regression tests
```

## Single test

```bash
just test-one tests/unit/logic/test_tlv.py              # whole file
just test-one tests/unit/logic/test_tlv.py::test_parse  # single test
just test-one <node> reset-only Release                  # custom mode + build type
```

## List tests in a file

```bash
just test-list tests/unit/logic/test_tlv.py
```

## Regression tests

```bash
just regression-test                          # all regression scenarios
just regression-test jogging_single_person    # specific scenario
just regression-store                         # update golden references
just regression-store jogging_single_person   # update one scenario
```

## Tracker regression tests

```bash
just regression-test-tracker                  # all tracker scenarios
just regression-test-tracker <scenario>       # specific scenario
just regression-store-tracker                 # update tracker golden references
just regression-store-tracker <scenario>      # update one scenario
```
