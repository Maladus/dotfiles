import os
import subprocess
import sys

def assert_exists(path, description):
    print(f"Checking {description}: {path}...", end=" ")
    if os.path.exists(os.path.expanduser(path)):
        print("✅")
    else:
        print("❌")
        return False
    return True

def assert_command_runs(command, description):
    print(f"Checking {description} ('{command}')...", end=" ")
    try:
        subprocess.run(command, shell=True, check=True, capture_output=True)
        print("✅")
        return True
    except subprocess.CalledProcessError:
        print("❌")
        return False

def main():
    tests = [
        (assert_exists, "~/.zshrc", "Zsh config"),
        (assert_exists, "~/.bashrc", "Bash config"),
        (assert_exists, "~/.gitconfig", "Git config"),
        (assert_command_runs, "mise --version", "Mise installation"),
    ]

    failed = 0
    for func, target, desc in tests:
        if not func(target, desc):
            failed += 1

    if failed > 0:
        print(f"\n❌ {failed} assertions failed.")
        sys.exit(1)
    else:
        print("\n✅ All assertions passed!")

if __name__ == "__main__":
    main()
