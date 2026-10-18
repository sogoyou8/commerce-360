// Créer au préalable le paramètre texte pDataRoot : chemin absolu vers commerce-360\.data
(stage as text, filename as text) as table =>
let
    SafeStage = if List.Contains({"e4", "e5"}, stage) then stage else error "Phase non autorisee",
    SafeName = if Text.EndsWith(filename, ".csv") and not Text.Contains(filename, "\") and not Text.Contains(filename, "/") then filename else error "Nom de fichier incorrect",
    FullPath = pDataRoot & "\" & SafeStage & "\" & SafeName,
    Raw = Csv.Document(File.Contents(FullPath), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Raw, [PromoteAllScalars=true])
in
    Promoted
