// Requête nommée « category_sales » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "category_sales.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"product_category", type text},
        {"sold_items", Int64.Type},
        {"orders_with_category", Int64.Type},
        {"distinct_products", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"freight_brl", Currency.Type},
        {"sales_share_pct", type number},
        {"sales_rank", Int64.Type}
    }, "en-US")
in
    Typed
