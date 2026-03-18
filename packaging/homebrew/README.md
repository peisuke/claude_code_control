# Homebrew Tap Setup

This formula is designed to be published in a separate tap repository.

## Setup

1. Create a GitHub repo `peisuke/homebrew-tap`
2. Copy `claude-code-control.rb` to `Formula/claude-code-control.rb`
3. Update the `sha256` hash:
   ```bash
   # Create a release tag first
   git tag v0.1.0 && git push origin v0.1.0
   # Download and hash
   curl -sL https://github.com/peisuke/claude_code_control/archive/refs/tags/v0.1.0.tar.gz | shasum -a 256
   ```
4. Commit and push to the tap repo

## Usage

```bash
brew tap peisuke/tap
brew install claude-code-control

# Start as a service (launchd)
brew services start claude-code-control

# Or run directly
claude-code-control
claude-code-control --port 9000

# Logs
tail -f $(brew --prefix)/var/log/claude-code-control.log

# Config
$EDITOR $(brew --prefix)/etc/claude-code-control/config.env
```

## Updating

When releasing a new version:
1. Tag the release: `git tag v1.2.3 && git push origin v1.2.3`
2. Get the new sha256
3. Update `url` and `sha256` in the formula
4. Push to the tap repo
