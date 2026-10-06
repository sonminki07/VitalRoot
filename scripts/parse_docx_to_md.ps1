Add-Type -AssemblyName System.IO.Compression.FileSystem

$dir = "D:\관광데이터\VitalRoot\docs\public_api_docs"
$docxFiles = Get-ChildItem -Path $dir -Filter "*.docx"

foreach ($file in $docxFiles) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
    $entry = $zip.GetEntry("word/document.xml")
    $stream = $entry.Open()
    $xmlDoc = New-Object System.Xml.XmlDocument
    $xmlDoc.Load($stream)
    $stream.Close()
    $zip.Dispose()

    $nsMgr = New-Object System.Xml.XmlNamespaceManager($xmlDoc.NameTable)
    $nsMgr.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $outMd = [System.IO.Path]::Combine($dir, ($file.BaseName + ".md"))
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("# " + $file.BaseName)
    [void]$sb.AppendLine("")

    $body = $xmlDoc.DocumentElement.SelectSingleNode("w:body", $nsMgr)
    if ($body -ne $null) {
        foreach ($child in $body.ChildNodes) {
            if ($child.LocalName -eq "p") {
                $texts = $child.SelectNodes(".//w:t", $nsMgr)
                $pText = ""
                foreach ($t in $texts) { $pText += $t.InnerText }
                if ($pText.Trim().Length -gt 0) {
                    [void]$sb.AppendLine($pText.Trim())
                    [void]$sb.AppendLine("")
                }
            } elseif ($child.LocalName -eq "tbl") {
                $rows = $child.SelectNodes(".//w:tr", $nsMgr)
                $first = $true
                foreach ($row in $rows) {
                    $cells = $row.SelectNodes(".//w:tc", $nsMgr)
                    $cellTexts = @()
                    foreach ($cell in $cells) {
                        $cTexts = $cell.SelectNodes(".//w:t", $nsMgr)
                        $cStr = ""
                        foreach ($ct in $cTexts) { $cStr += $ct.InnerText }
                        $cleanC = ($cStr -replace '\|', '\|' -replace "\r?\n", " ").Trim()
                        $cellTexts += $cleanC
                    }
                    if ($cellTexts.Count -gt 0) {
                        [void]$sb.AppendLine("| " + ($cellTexts -join " | ") + " |")
                        if ($first) {
                            $divs = @()
                            for ($i = 0; $i -lt $cellTexts.Count; $i++) { $divs += "---" }
                            [void]$sb.AppendLine("| " + ($divs -join " | ") + " |")
                            $first = $false
                        }
                    }
                }
                [void]$sb.AppendLine("")
            }
        }
    }

    [System.IO.File]::WriteAllText($outMd, $sb.ToString(), [System.Text.Encoding]::UTF8)
    Write-Output "Successfully generated: $outMd ($([Math]::Round($sb.Length / 1024, 1)) KB)"
}
