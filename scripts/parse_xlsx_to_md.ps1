Add-Type -AssemblyName System.IO.Compression.FileSystem

$dir = "D:\관광데이터\VitalRoot\docs\public_api_docs"
$xlsxFile = [System.IO.Path]::Combine($dir, "신분류체계정보 관광타입정보 연계 정의서.xlsx")
$outMd = [System.IO.Path]::Combine($dir, "신분류체계정보_관광타입정보_연계_정의서.md")

$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsxFile)

# Load shared strings
$sharedStrings = @()
$ssEntry = $zip.GetEntry("xl/sharedStrings.xml")
if ($ssEntry -ne $null) {
    $stream = $ssEntry.Open()
    [xml]$ssXml = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
    $stream.Close()
    $nsMgr = New-Object System.Xml.XmlNamespaceManager($ssXml.NameTable)
    $nsMgr.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    foreach ($si in $ssXml.SelectNodes("//x:si", $nsMgr)) {
        $sharedStrings += $si.InnerText
    }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# 신분류체계정보 관광타입정보 연계 정의서")
[void]$sb.AppendLine("")

# Look for sheets
foreach ($entry in $zip.Entries) {
    if ($entry.FullName -like "xl/worksheets/sheet*.xml") {
        $sheetName = [System.IO.Path]::GetFileNameWithoutExtension($entry.Name)
        [void]$sb.AppendLine("## Sheet: $sheetName")
        [void]$sb.AppendLine("")

        $stream = $entry.Open()
        [xml]$sheetXml = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
        $stream.Close()
        $nsMgr = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
        $nsMgr.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

        $rows = $sheetXml.SelectNodes("//x:row", $nsMgr)
        $first = $true
        $rowCount = 0
        foreach ($row in $rows) {
            $cNodes = $row.SelectNodes("x:c", $nsMgr)
            $cellTexts = @()
            foreach ($c in $cNodes) {
                $val = ""
                $tAttr = $c.GetAttribute("t")
                $vNode = $c.SelectSingleNode("x:v", $nsMgr)
                if ($vNode -ne $null) {
                    if ($tAttr -eq "s") {
                        $idx = [int]$vNode.InnerText
                        if ($idx -lt $sharedStrings.Count) { $val = $sharedStrings[$idx] }
                    } else {
                        $val = $vNode.InnerText
                    }
                }
                $cleanVal = ($val -replace '\|', '\|' -replace "\r?\n", " ").Trim()
                $cellTexts += $cleanVal
            }
            if ($cellTexts.Count -gt 0) {
                [void]$sb.AppendLine("| " + ($cellTexts -join " | ") + " |")
                if ($first) {
                    $divs = @()
                    for ($i = 0; $i -lt $cellTexts.Count; $i++) { $divs += "---" }
                    [void]$sb.AppendLine("| " + ($divs -join " | ") + " |")
                    $first = $false
                }
                $rowCount++
                if ($rowCount -gt 300) {
                    [void]$sb.AppendLine("| ... (이하 생략) |")
                    break
                }
            }
        }
        [void]$sb.AppendLine("")
    }
}
$zip.Dispose()

[System.IO.File]::WriteAllText($outMd, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Successfully generated: $outMd ($([Math]::Round($sb.Length / 1024, 1)) KB)"
