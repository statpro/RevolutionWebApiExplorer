using System;
using System.Linq;
using System.Xml.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Globalization;
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
        private static ReadOnlyCollection<CultureInfo> _exportCultures;

        // Constructor.
        public GlobalStateAccess()
        {
        }

        #region Methods
        // Initializes global state.
        // 'webApiSegmentsTreeMeasuresUri' must specify the Web API URI that returns information about the requestable
        // measures from the Segments Tree Node resource.
        // 'exportCultureNames' must specify the names (e.g. "en-US") of the cultures that can be used when
        // exporting data (e.g. CSV data); can be null/empty.  The culture names must be separated by spaces.
        // Throws an exception and logs an error in the event of error.
        public async static void Init(Uri webApiSegmentsTreeMeasuresUri, String exportCultureNames,
            ILogging logging)
        {
            if (webApiSegmentsTreeMeasuresUri == null)
                throw new ArgumentNullException("webApiSegmentsTreeMeasuresUri");


            // Get information about the Segments Tree Node measures.
            // NOTE: the Segments Tree Node measures (as opposed to the Time Series measures) can grow from time
            // to time (from sprint to sprint), so we pull down the latest list whenever the app starts up.
            String measuresXml = String.Empty;
            HttpClient httpClient = null;
            try
            {
                httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
                var response = await httpClient.GetAsync(webApiSegmentsTreeMeasuresUri);
                response.EnsureSuccessStatusCode();
                measuresXml = await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Failed to get information about the Segments Tree Node measures from " +
                                   "the Web API.  " + ex.ToString();
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


            // Parse the measures info XML, and store the resulting collection in '_segmentsTreeMeasures'.
            try
            {
                var doc = XDocument.Parse(measuresXml);
                XNamespace ns = "http://statpro.com/2012/Revolution";
                _segmentsTreeMeasures = doc.Root
                                           .Element(ns + "measures").Elements(ns + "measure")
                                           .Select(me => new MeasureInfo(me, ns))
                                           .ToList().AsReadOnly();
            }
            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Failed to parse the information about the Segments Tree Node measures that " +
                                   "was returned by the Web API.  " + ex.ToString();
                System.Diagnostics.Debug.WriteLine(errorMessage);
                if (logging != null)
                    logging.LogError(errorMessage);

                throw;
            }


            // Derive a separate collection of the named categories into which the Segments Tree Node measures
            // fall.
            _segmentsTreeMeasureCategories = _segmentsTreeMeasures.Select(mi => mi.Category)
                                                                  .Distinct()
                                                                  .OrderBy(c => c)
                                                                  .ToList().AsReadOnly();


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
