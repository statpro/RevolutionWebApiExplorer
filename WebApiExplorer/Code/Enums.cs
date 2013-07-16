using System;
using System.Diagnostics.CodeAnalysis;

namespace StatPro.Revolution.WebApiExplorer
{
    // Defines identifiers for the different formats of Web API resource representation.
    public enum RepresentationFormat
    {
        // XML
        Xml,

        // JSON
        Json,
    }

    // Defines identifiers for the Revolution Web API's error codes.
    [SuppressMessage("Microsoft.Design", "CA1008:EnumsShouldHaveZeroValue", 
        Justification = "The error codes start at 800.")]
    public enum WebApiErrorCode
    {
        EulaIdentifierTooLong = 800,

        PortfoliosFilterStringTooLong = 801,

        PortfoliosOrderByStringTooLong = 802,

        PortfoliosSkipStringTooLong = 803,

        PortfoliosTopStringTooLong = 804,

        PortfoliosFilterStringInvalid = 805,

        PortfoliosOrderByStringInvalid = 806,

        PortfoliosSkipStringInvalid = 807,

        PortfoliosSkipValueNegative = 808,

        PortfoliosTopStringInvalid = 809,

        PortfoliosTopValueNegative = 810,

        PortfolioIdentifierMissingOrTooLong = 811,

        AnalysisIdentifierMissingOrTooLong = 812,

        SegmentIdentifierMissingOrTooLong = 813,

        ChildrenFilterStringTooLong = 814,

        ChildrenOrderByStringTooLong = 815,

        ChildrenSkipStringTooLong = 816,

        ChildrenTopStringTooLong = 817,

        ChildrenFilterStringInvalid = 818,

        ChildrenOrderByStringInvalid = 819,

        ChildrenSkipStringInvalid = 820,

        ChildrenSkipValueNegative = 821,

        ChildrenTopStringInvalid = 822,

        ChildrenTopValueNegative = 823,

        PortfolioIdentifierFormatInvalid = 824,

        AnalysisIdentifierFormatInvalid = 825,

        SegmentIdentifierFormatInvalid = 826,

        StartDateStringTooLong = 827,

        EndDateStringTooLong = 828,

        SeriesTypeStringTooLong = 829,

        NoMeasureIdsSpecified = 830,

        StartDateFormatInvalid = 831,

        EndDateFormatInvalid = 832,

        UnexpectedError = 833,

        ValueOutOfRange = 834,

        EulaNotFoundOrNotLatest = 835,

        EulaNotAccepted = 836,

        InvalidFiltering = 837,

        InvalidOrdering = 838,

        PortfolioNotFound = 839,

        AnalysisNotFound = 840,

        SegmentNotFound = 841,

        InvalidTimePeriod = 842,

        InvalidMeasure = 843,

        IncludeStringInvalid = 844,

        MeasureIdsListTooLong = 845,

        IncludeMeasuresForStringTooLong = 846,

        IncludeMeasuresForStringInvalid = 847,

        LastSuccessfulStringTooLong = 848,

        LastSuccessfulStringInvalid = 849,

        TimeSeriesTypeStringInvalid = 850,

        RequestUriNotHttps = 851,

        UserTenancyAndClientAppBlacklisted = 852,

        Timeout = 853,
    }
}
