class ClaudeCodeControl < Formula
  include Language::Python::Virtualenv

  desc "tmux controller backend for Claude Code sessions"
  homepage "https://github.com/peisuke/claude_code_control"
  url "https://github.com/peisuke/claude_code_control/archive/refs/tags/v0.1.0.tar.gz"
  # Update sha256 after creating the release tag:
  #   curl -sL https://github.com/peisuke/claude_code_control/archive/refs/tags/v0.1.0.tar.gz | shasum -a 256
  sha256 "PLACEHOLDER_UPDATE_BEFORE_PUBLISH"
  license "MIT"

  depends_on "python@3.11"
  depends_on "tmux"

  def install
    # Create virtualenv and install dependencies
    venv = virtualenv_create(libexec, "python3.11")
    venv.pip_install "-r", buildpath/"backend/requirements.txt"

    # Copy backend source
    (libexec/"backend").mkpath
    (libexec/"backend/app").install Dir[buildpath/"backend/app/*"].reject { |f| f.include?("__pycache__") }
    touch libexec/"backend/__init__.py"

    # Create wrapper script that sources config.env and sets PYTHONPATH
    (bin/"claude-code-control").write <<~EOS
      #!/bin/bash
      CONFIG_FILE="#{etc}/claude-code-control/config.env"
      if [ -f "$CONFIG_FILE" ]; then
        set -a
        source "$CONFIG_FILE"
        set +a
      fi
      export STATE_DIR="#{var}/claude-code-control"
      export PYTHONPATH="#{libexec}"
      mkdir -p "$STATE_DIR"
      exec "#{libexec}/bin/uvicorn" backend.app.main:app \\
        --host "${HOST:-0.0.0.0}" \\
        --port "${PORT:-8192}" \\
        "$@"
    EOS
    chmod 0755, bin/"claude-code-control"

    # Install default config (preserve existing on upgrade)
    (etc/"claude-code-control").mkpath
    config = etc/"claude-code-control/config.env"
    unless config.exist?
      config.write <<~EOS
        # Claude Code Control configuration
        HOST=0.0.0.0
        PORT=8192
      EOS
    end
  end

  def post_install
    (var/"claude-code-control").mkpath
    (var/"log").mkpath
  end

  service do
    run [opt_bin/"claude-code-control"]
    keep_alive true
    working_dir HOMEBREW_PREFIX
    log_path var/"log/claude-code-control.log"
    error_log_path var/"log/claude-code-control-error.log"
    environment_variables PATH: "#{HOMEBREW_PREFIX}/bin:#{HOMEBREW_PREFIX}/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
  end

  test do
    port = free_port
    pid = spawn({ "PORT" => port.to_s }, bin/"claude-code-control")
    output = shell_output("curl -sf --retry 5 --retry-delay 1 --retry-connrefused http://localhost:#{port}/health")
    assert_match "healthy", output
  ensure
    if pid
      Process.kill("TERM", pid)
      Process.wait(pid)
    end
  end
end
