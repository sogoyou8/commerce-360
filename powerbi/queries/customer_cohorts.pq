// Requête nommée « customer_cohorts » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "customer_cohorts.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"first_observed_month", type date},
        {"observed_customers", Int64.Type},
        {"repeat_customers", Int64.Type},
        {"observed_repeat_rate_pct", type number},
        {"observed_sales_brl", Currency.Type}
    }, "en-US")
in
    Typed
