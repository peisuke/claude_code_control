class ClaudeCodeControl < Formula
  desc "tmux controller backend for Claude Code sessions"
  homepage "https://github.com/peisuke/claude_code_control"
  url "https://github.com/peisuke/claude_code_control/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "PLACEHOLDER"
  license "MIT"

  depends_on "python@3.11"
  depends_on "tmux"

  def install
    # Create virtualenv and install dependencies
    venv = virtualenv_create(libexec, "python3.11")
    venv.pip_install_and_link buildpath/"backend/requirements.txt"

    # Copy backend source
    (libexec/"backend").install Dir["backend/app"]
    (libexec/"backend").install "backend/__init__.py" if File.exist?("backend/__init__.py")
    touch libexec/"backend/__init__.py"

    # Create wrapper script
    (bin/"claude-code-control").write <<~EOS
      #!/bin/bash
      export STATE_DIR="${var}/claude-code-control"
      mkdir -p "$STATE_DIR"
      exec "#{libexec}/bin/uvicorn" backend.app.main:app \
        --host "${HOST:-0.0.0.0}" \
        --port "${PORT:-8192}" \
        "$@"
    EOS

    # Install config
    (etc/"claude-code-control").mkpath
    (etc/"claude-code-control/config.env").write <<~EOS
      # Claude Code Control configuration
      HOST=0.0.0.0
      PORT=8192
    EOS
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
    error_log_path var/"log/claude-code-control.log"
    environment_variables PATH: "#{HOMEBREW_PREFIX}/bin:#{HOMEBREW_PREFIX}/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
  end

  test do
    # Start server briefly and check health endpoint
    port = free_port
    pid = spawn bin/"claude-code-control", "--port", port.to_s
    sleep 2
    output = shell_output("curl -sf http://localhost:#{port}/health")
    assert_match "healthy", output
  ensure
    Process.kill("TERM", pid) if pid
  end
end
