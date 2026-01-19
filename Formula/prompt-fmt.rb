class PromptFmt < Formula
  desc "Transform casual prompts into well-formatted prompts optimized for Claude Code"
  homepage "https://github.com/elec7rik/prompt-fmt"
  version "1.0.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/elec7rik/prompt-fmt/releases/download/v#{version}/prompt-fmt-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_ARM64"
    else
      url "https://github.com/elec7rik/prompt-fmt/releases/download/v#{version}/prompt-fmt-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_X64"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/elec7rik/prompt-fmt/releases/download/v#{version}/prompt-fmt-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX_ARM64"
    else
      url "https://github.com/elec7rik/prompt-fmt/releases/download/v#{version}/prompt-fmt-linux-x64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX_X64"
    end
  end

  def install
    bin.install "prompt-fmt"
  end

  test do
    assert_match "Transform casual prompts", shell_output("#{bin}/prompt-fmt --help")
  end
end
