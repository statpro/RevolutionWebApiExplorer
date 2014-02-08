using System;
using System.Linq;
using System.Xml.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Globalization;
using System.Threading.Tasks;
using System.Collections.ObjectModel;
using System.Collections.Generic;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements IGlobalStateAccess for the website.
    public class GlobalStateAccess : IGlobalStateAccess
    {
        private static ReadOnlyCollection<MeasureInfo> _segmentsTreeMeasures;
        private static ReadOnlyCollection<String> _segmentsTreeMeasureCategories;
        private static ReadOnlyCollection<MeasureInfo> _timeSeriesMeasures;
        private static ReadOnlyCollection<String> _timeSeriesMeasureCategories;
        private static ReadOnlyCollection<CultureInfo> _exportCultures;

        // Constructor.
        public GlobalStateAccess()
        {
        }

        #region Methods
        // Initializes global state.
        // Throws an exception and logs an error in the event of error.
        //
        // 'webApiSegmentsTreeMeasuresUri' must specify the Web API URI that returns information about the requestable
        // measures from the Segments Tree Node resource.
        // 'webApiTimeSeriesMeasuresUri' must specify the Web API URI that returns information about the requestable
        // measures from the Time Series resource.
        // 'exportCultureNames' must specify the names (e.g. "en-US") of the cultures that can be used when
        // exporting data (e.g. CSV data); can be null/empty.  The culture names must be separated by spaces.
        //
        public static void Init(Uri webApiSegmentsTreeMeasuresUri, Uri webApiTimeSeriesMeasuresUri,
            String exportCultureNames, ILogging logging)
        {
            if (webApiSegmentsTreeMeasuresUri == null)
                throw new ArgumentNullException("webApiSegmentsTreeMeasuresUri");
            if (webApiTimeSeriesMeasuresUri == null)
                throw new ArgumentNullException("webApiTimeSeriesMeasuresUri");


            // Get information about the Segments Tree Node measures synchronously (will throw exception if failed).
            var task = GetMeasuresDataAsync(webApiSegmentsTreeMeasuresUri, logging);
            var data = task.Result;  // waits, or throws AggregateException
            _segmentsTreeMeasures = data.Item1.AsReadOnly();
            _segmentsTreeMeasureCategories = data.Item2.AsReadOnly();


            // Get information about the Time Series measures synchronously (will throw exception if failed).
            task = GetMeasuresDataAsync(webApiTimeSeriesMeasuresUri, logging);
            data = task.Result;  // waits, or throws AggregateException
            _timeSeriesMeasures = data.Item1.AsReadOnly();
            _timeSeriesMeasureCategories = data.Item2.AsReadOnly();


            // Set up the collection of export cultures.  Unrecognised culture names are ignored.
            if (String.IsNullOrWhiteSpace(exportCultureNames))
            {
                _exportCultures = new List<CultureInfo>().AsReadOnly();
                return;
            }

            Func<String, CultureInfo> getCultureOrNull = name => 
                { try { return new CultureInfo(name); } catch (CultureNotFoundException) { return null; } };

            _exportCultures = exportCultureNames.Split(' ')
                                                .Select(name => getCultureOrNull(name))
                                                .Where(ci => ci != null)
                                                .OrderBy(ci => ci.DisplayName)
                                                .ToList().AsReadOnly();
        }

        // Returns information about Segments Tree Node or Time Series requestable measures that is exposed by the
        // specified Web API documentation URI.  In the returned tuple, item 1 will contain a list of all the measures
        // and item 2 will contain a list of the names of all the distinct categories in which the measures live.
        // Throws an exception and logs an error in the event of error.
        private async static Task<Tuple<List<MeasureInfo>, List<String>>> GetMeasuresDataAsync(Uri uri,
            ILogging logging)
        {
            // Get information about the measures from the specified URI.
            String measuresXml = String.Empty;
            HttpClient httpClient = null;
            try
            {
                httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
                var response = await httpClient.GetAsync(uri);
                response.EnsureSuccessStatusCode();
                measuresXml = await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Failed to get information about measures from " + uri.ToString() + ".  " +
                                   ex.ToString();
                System.Diagnostics.Debug.WriteLine(errorMessage);
                if (logging != null)
                    logging.LogError(errorMessage);

                throw;
            }
            finally
            {
                if (httpClient != null)
                    httpClient.Dispose();
            }


            // Parse the measures info XML.
            List<MeasureInfo> measures;
            try
            {
                var doc = XDocument.Parse(measuresXml);
                XNamespace ns = "http://statpro.com/2012/Revolution";
                measures = doc.Root
                              .Element(ns + "measures").Elements(ns + "measure")
                              .Select(me => new MeasureInfo(me, ns))
                              .ToList();
            }
            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Failed to parse the information about the measures that was retrieved from " +
                                   uri.ToString() + ".  " + ex.ToString();
                System.Diagnostics.Debug.WriteLine(errorMessage);
                if (logging != null)
                    logging.LogError(errorMessage);

                throw;
            }


            // Derive a separate collection of the named categories into which the measures fall.
            var categories = measures.Select(mi => mi.Category)
                                     .Distinct()
                                     .OrderBy(c => c)
                                     .ToList();


            // Return both the measures and the categories.
            return Tuple.Create(measures, categories);
        }
        #endregion

        #region IGlobalStateAccess Implementation
        // Gets information about all the measures that can be requested for inclusion in a Segments Tree Node
        // resource representation.
        public ReadOnlyCollection<MeasureInfo> SegmentsTreeNodeMeasuresInfo
        {
            get
            {
                return _segmentsTreeMeasures;
            }
        }

        // Gets a collection of all the named categories into which the Segments Tree Node measures fall.
        public ReadOnlyCollection<String> SegmentsTreeNodeMeasureCategories
        {
            get
            {
                return _segmentsTreeMeasureCategories;
            }
        }

        // Gets information about all the measures that can be requested for inclusion in a Time Series
        // resource representation.
        public ReadOnlyCollection<MeasureInfo> TimeSeriesMeasuresInfo
        {
            get
            {
                return _timeSeriesMeasures;
            }
        }

        // Gets a collection of all the named categories into which the Time Series measures fall.
        public ReadOnlyCollection<String> TimeSeriesMeasureCategories
        {
            get
            {
                return _timeSeriesMeasureCategories;
            }
        }

        // Gets a collection of all the cultures that can be used when exporting data (e.g. CSV data).
        public ReadOnlyCollection<CultureInfo> ExportCultures
        {
            get
            {
                return _exportCultures;
            }
        }
        #endregion
    }
}
