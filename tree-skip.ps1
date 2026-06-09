param(
    [string]$Root = $PSScriptRoot,
    [string]$OutFile = ""
)

$Exclude = @(
    "node_modules",
    ".vscode",
    ".pytest_cache",
    ".venv",
    "mentalriskes",
    ".next",
    ".agents",
    ".git"
)

function Show-Tree {
    param(
        [string]$Path,
        [string]$Prefix = ""
    )

    $items = Get-ChildItem -LiteralPath $Path -Force |
        Where-Object { $Exclude -notcontains $_.Name } |
        Sort-Object @{Expression={$_.PSIsContainer};Descending=$true}, Name

    for ($i = 0; $i -lt $items.Count; $i++) {

        $item = $items[$i]
        $isLast = ($i -eq ($items.Count - 1))

        if ($isLast) {
            $branch = "\--- "
            $nextPrefix = $Prefix + "     "
        }
        else {
            $branch = "+--- "
            $nextPrefix = $Prefix + "|    "
        }

        $line = $Prefix + $branch + $item.Name
        $script:Lines += $line

        if ($item.PSIsContainer) {
            Show-Tree -Path $item.FullName -Prefix $nextPrefix
        }
    }
}

$script:Lines = @()
$script:Lines += Split-Path $Root -Leaf

Show-Tree $Root

if ($OutFile -ne "") {
    $script:Lines | Out-File -FilePath $OutFile -Encoding UTF8
}
else {
    $script:Lines
}