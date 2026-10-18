// Requête nommée « seller_sales » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "seller_sales.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"seller_id", type text},
        {"seller_state", type text},
        {"seller_city", type text},
        {"sold_items", Int64.Type},
        {"orders_with_seller", Int64.Type},
        {"distinct_products", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"freight_brl", Currency.Type},
        {"sales_share_pct", type number},
        {"sales_rank", Int64.Type}
    }, "en-US")
in
    Typed
