# -- CorpConnect Local Shift-Left Security Audits --
# Runs as a Git pre-commit hook. Exit 1 blocks the commit.

param(
    [switch]$SkipAudit  # Pass -SkipAudit to skip slow dependency checks during rapid iteration
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CorpConnect - Shift-Left Security Scan"      -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$hasErrors = $false

# -- 1. Secret Scanning --
Write-Host ""
Write-Host "[1/3] Scanning staged files for credentials and tokens..." -ForegroundColor Yellow

$patterns = @(
    # Platform-specific keys
    "SENTRY_AUTH_TOKEN\s*=\s*['""]?[A-Za-z0-9_\-]{32,}",
    "STRIPE_SECRET_KEY\s*=\s*['""]?sk_(live|test)_[A-Za-z0-9]{24,}",
    "NEXTAUTH_SECRET\s*=\s*['""]?[A-Za-z0-9+/=]{32,}",
    "AUTH_SECRET\s*=\s*['""]?[A-Za-z0-9+/=]{16,}",
    "LIVEKIT_API_SECRET\s*=\s*['""]?[A-Za-z0-9]{16,}",
    "RAZORPAY_KEY_SECRET\s*=\s*['""]?[A-Za-z0-9]{16,}",
    "UPLOADTHING_SECRET\s*=\s*['""]?[A-Za-z0-9_\-]{16,}",
    # Database URLs with embedded credentials
    "DATABASE_URL\s*=\s*['""]?postgres(ql)?://[^:]+:[^@]+@",
    # AWS access keys
    "AKIA[0-9A-Z]{16}",
    # Generic private key headers
    "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
    # Generic high-value patterns
    "(api[_-]?key|api[_-]?secret|access[_-]?token)\s*[:=]\s*['""]?[A-Za-z0-9_\-]{16,}"
)

# Scan staged files (these are what actually gets committed)
$stagedFiles = git diff --name-only --cached 2>$null
$secretsFound = $false

if ($stagedFiles) {
    foreach ($file in $stagedFiles) {
        # Skip binary files and known safe files
        if ($file -match "\.(png|jpg|jpeg|gif|ico|svg|woff|ttf|eot|lock|lockb)$") { continue }
        if (-not (Test-Path $file)) { continue }

        $content = Get-Content -Raw -Path $file -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                Write-Host "  [CRITICAL] Secret detected in staged file: $file" -ForegroundColor Red
                Write-Host "             Pattern: $pattern" -ForegroundColor DarkRed
                $hasErrors = $true
                $secretsFound = $true
                break  # One finding per file is enough to flag it
            }
        }
    }
}

# Also warn (non-blocking) about unstaged changes
$unstagedFiles = git diff --name-only 2>$null
if ($unstagedFiles) {
    foreach ($file in $unstagedFiles) {
        if ($file -match "\.(png|jpg|jpeg|gif|ico|svg|woff|ttf|eot|lock|lockb)$") { continue }
        if (-not (Test-Path $file)) { continue }

        $content = Get-Content -Raw -Path $file -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                Write-Host "  [WARNING] Potential secret in UNSTAGED file: $file (not blocking)" -ForegroundColor Yellow
                break
            }
        }
    }
}

if (-not $secretsFound) {
    Write-Host "  OK - No leaked credentials detected in staged files." -ForegroundColor Green
}

# -- 2. Node Dependency Audit --
if (-not $SkipAudit) {
    Write-Host ""
    Write-Host "[2/3] Auditing Node.js dependencies for CVEs..." -ForegroundColor Yellow
    $pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpmCheck) {
        pnpm audit --audit-level=high 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [WARNING] Vulnerabilities detected in Node packages. Run 'pnpm audit' for details." -ForegroundColor Yellow
            # Uncomment the line below to make dependency vulns block commits:
            # $hasErrors = $true
        } else {
            Write-Host "  OK - No high/critical vulnerabilities in Node packages." -ForegroundColor Green
        }
    } else {
        Write-Host "  Skipping - pnpm not found." -ForegroundColor Gray
    }

    # -- 3. Python Dependency Audit --
    Write-Host ""
    Write-Host "[3/3] Auditing Python AI service dependencies..." -ForegroundColor Yellow
    if (Test-Path "ai-service/requirements.txt") {
        $safetyCheck = Get-Command safety -ErrorAction SilentlyContinue
        if ($safetyCheck) {
            safety check -r ai-service/requirements.txt 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  [WARNING] Python vulnerabilities found. Run 'safety check -r ai-service/requirements.txt' for details." -ForegroundColor Yellow
            } else {
                Write-Host "  OK - Python dependencies are secure." -ForegroundColor Green
            }
        } else {
            Write-Host "  Skipping - 'safety' not installed (pip install safety)." -ForegroundColor Gray
        }
    } else {
        Write-Host "  Skipping - ai-service/requirements.txt not found." -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "[2/3] Skipped (--SkipAudit)" -ForegroundColor Gray
    Write-Host "[3/3] Skipped (--SkipAudit)" -ForegroundColor Gray
}

# -- Final Verdict --
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "  BLOCKED - Security issues found. Commit aborted." -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "  PASSED - All security checks passed." -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Cyan
    exit 0
}
