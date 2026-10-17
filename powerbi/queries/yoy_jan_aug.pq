// Requête nommée « yoy_jan_aug » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "yoy_jan_aug.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"month_num", Int64.Type},
        {"orders_2017", Int64.Type},
        {"orders_2018", Int64.Type},
        {"sales_2017_brl", Currency.Type},
        {"sales_2018_brl", Currency.Type},
        {"sales_change_pct", type number}
    }, "en-US")
in
    Typed
