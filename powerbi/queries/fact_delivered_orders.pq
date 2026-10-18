// Requête nommée « fact_delivered_orders » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "fact_delivered_orders.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"order_id", type text},
        {"purchase_date", type date},
        {"purchase_month", type date},
        {"customer_state", type text},
        {"item_count", Int64.Type},
        {"item_revenue_brl", Currency.Type},
        {"freight_brl", Currency.Type},
        {"delivery_group", type text},
        {"delivery_days", type number},
        {"delivery_days_clean", type number},
        {"review_score", Int64.Type},
        {"low_review_score", type text}
    }, "en-US")
in
    Typed
