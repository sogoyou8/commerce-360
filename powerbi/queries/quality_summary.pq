// Requête nommée « quality_summary » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "quality_summary.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"orders_in_window", Int64.Type},
        {"delivered_orders", Int64.Type},
        {"orders_without_items", Int64.Type},
        {"orders_without_payments", Int64.Type},
        {"orders_without_selected_review", Int64.Type},
        {"orders_without_geo", Int64.Type},
        {"delivered_missing_actual_date", Int64.Type},
        {"suspicious_carrier_dates", Int64.Type},
        {"sold_items_without_category", Int64.Type}
    }, "en-US")
in
    Typed
