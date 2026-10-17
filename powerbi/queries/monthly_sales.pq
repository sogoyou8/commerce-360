// Requête nommée « monthly_sales » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "monthly_sales.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"month_start", type date},
        {"orders_all_statuses", Int64.Type},
        {"delivered_orders", Int64.Type},
        {"delivered_customers", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"freight_brl", Currency.Type},
        {"average_basket_brl", Currency.Type}
    }, "en-US")
in
    Typed
