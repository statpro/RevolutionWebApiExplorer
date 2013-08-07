using System;
using System.Net;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using NUnit.Framework;
using NSubstitute;

using StatPro.Revolution.WebApiExplorer;
using StatPro.Revolution.WebApiExplorer.Controllers;

namespace StatPro.Revolution.WebApiExplorerTests.ControllerTests
{
    [TestFixture]
    public class WebApiControllerTests : BaseControllerTests
    {
        // Constructor.
        public WebApiControllerTests()
        {
        }

        #region GetJsResourceTypeName Tests
        [TestCase(null, null)]
        [TestCase("", null)]
        [TestCase("  ", null)]
        [TestCase("hello", null)]
        [TestCase("text/html", null)]
        [TestCase("application/json", null)]
        [TestCase("application/vnd.statpro.revolution.api.service", "service")]
        [TestCase("application/vnd.statpro.revolution.api.service+xml", "service")]
        [TestCase("application/vnd.statpro.revolution.api.service+json", "service")]
        [TestCase("application/vnd.statpro.revolution.api.portfolios", "portfolios")]
        [TestCase("application/vnd.statpro.revolution.api.portfolios+xml", "portfolios")]
        [TestCase("application/vnd.statpro.revolution.api.portfolios+json", "portfolios")]
        [TestCase("application/vnd.statpro.revolution.api.portfolio-analysis", "portfolioAnalysis")]
        [TestCase("application/vnd.statpro.revolution.api.portfolio-analysis+xml", "portfolioAnalysis")]
        [TestCase("application/vnd.statpro.revolution.api.portfolio-analysis+json", "portfolioAnalysis")]
        [TestCase("application/vnd.statpro.revolution.api.segments-tree-node", "segmentsTreeNode")]
        [TestCase("application/vnd.statpro.revolution.api.segments-tree-node+xml", "segmentsTreeNode")]
        [TestCase("application/vnd.statpro.revolution.api.segments-tree-node+json", "segmentsTreeNode")]
        [TestCase("application/vnd.statpro.revolution.api.time-series", "timeSeries")]
        [TestCase("application/vnd.statpro.revolution.api.time-series+xml", "timeSeries")]
        [TestCase("application/vnd.statpro.revolution.api.time-series+json", "timeSeries")]
        public void GetJsResourceTypeName_MediaTypeName_ReturnsExpectedTypeName(String mediaTypeName, 
            String expectedTypeName)
        {
            /* Arrange */

            /* Act */
            var typeName = WebApiController.GetJsResourceTypeName(mediaTypeName);

            /* Assert */
            Assert.That(typeName, Is.EqualTo(expectedTypeName));
        }
        #endregion

        #region GetJsWebApiErrorCode Tests
        [TestCase(null, null, null)]
        [TestCase(WebApiErrorCode.AnalysisNotFound, null, "AnalysisNotFound")]
        [TestCase(WebApiErrorCode.IncludeMeasuresForStringTooLong, null, "IncludeMeasuresForStringTooLong")]
        [TestCase(null, 4, "4")]
        [TestCase(null, 1001, "1001")]
        public void GetJsWebApiErrorCode_WebApiException_ReturnsExpectedErrorCode(WebApiErrorCode? errorCode, 
            Int32? unrecognisedErrorCode, String expectedCode)
        {
            /* Arrange */
            var ex = new WebApiException()
            {
                ErrorCode = errorCode,
                UnrecognisedErrorCode = unrecognisedErrorCode
            };

            /* Act */
            var code = WebApiController.GetJsWebApiErrorCode(ex);

            /* Assert */
            Assert.That(code, Is.EqualTo(expectedCode));
        }
        #endregion

        #region GetWebApiResourceResult Tests
        [TestCase("some json data", "application/vnd.statpro.revolution.api.service+json", true, "service")]
        [TestCase("some xml data", "application/vnd.statpro.revolution.api.service+xml", false, "service")]
        public void GetWebApiResourceResult_ValidMediaTypeName_ReturnsSuccessResult(
            String representation, String mediaTypeName, Boolean isJson, String jsTypeName)
        {
            /* Arrange */

            /* Act */
            var result = WebApiController.GetWebApiResourceResult(representation, mediaTypeName, null);

            /* Assert */
            Assert.That(result.TypedData.success, Is.True);
            Assert.That(result.TypedData.httpStatus, Is.EqualTo(200));
            Assert.That(result.TypedData.reasonPhrase, Is.EqualTo("OK"));
            Assert.That(result.TypedData.webApiErrorCode, Is.Null);
            Assert.That(result.TypedData.representation, Is.EqualTo(representation));
            Assert.That(result.TypedData.isJson, Is.EqualTo(isJson));
            Assert.That(result.TypedData.type, Is.EqualTo(jsTypeName));
        }

        [TestCase("some data", "unknown media type name")]
        [TestCase("some data", "application/vnd.statpro.revolution.api.service")]  // no indication of XML or JSON
        public void GetWebApiResourceResult_InvalidMediaTypeName_ReturnsFailedResult(String representation,
            String mediaTypeName)
        {
            /* Arrange */

            /* Act */
            var result = WebApiController.GetWebApiResourceResult(representation, mediaTypeName, null);

            /* Assert */
            Assert.That(result.TypedData.success, Is.False);
            Assert.That(result.TypedData.failedMessage, Is.Not.Empty);
        }
        #endregion

        #region GetWebApiResourceResultOnError Tests
        [TestCase(null, false, 0)]
        [TestCase(HttpStatusCode.BadRequest, true, 400)]
        [TestCase(HttpStatusCode.Unauthorized, true, 401)]
        [TestCase(HttpStatusCode.NotFound, true, 404)]
        [TestCase(HttpStatusCode.InternalServerError, true, 500)]
        public void GetWebApiResourceResultOnError_ErrorCondition_ReturnsExpectedResult(HttpStatusCode? statusCode,
            Boolean expectedSuccess, Int32 expectedStatus)
        {
            /* Arrange */
            var ex = new WebApiException() { StatusCode = statusCode };

            /* Act */
            Boolean getNewAccessToken;
            var result = WebApiController.GetWebApiResourceResultOnError(ex, 0, out getNewAccessToken);

            /* Assert */
            Assert.That(result.TypedData.success, Is.EqualTo(expectedSuccess));

            if (expectedSuccess)
                Assert.That(result.TypedData.httpStatus, Is.EqualTo(expectedStatus));
        }

        [TestCase(null, null)]
        [TestCase(WebApiErrorCode.AnalysisNotFound, "AnalysisNotFound")]
        [TestCase(WebApiErrorCode.StartDateStringTooLong, "StartDateStringTooLong")]
        public void GetWebApiResourceResultOnError_WebApiErrorCode_ReturnsExceptedErrorCode(
            WebApiErrorCode? errorCode, String expectedErrorCode)
        {
            /* Arrange */
            var ex = new WebApiException()
            {
                StatusCode = HttpStatusCode.BadRequest,
                ErrorCode = errorCode
            };

            /* Act */
            Boolean getNewAccessToken;
            var result = WebApiController.GetWebApiResourceResultOnError(ex, 0, out getNewAccessToken);

            /* Assert */
            Assert.That(result.TypedData.success, Is.EqualTo(true));
            Assert.That(result.TypedData.webApiErrorCode, Is.EqualTo(expectedErrorCode));
        }

        [TestCase(0, true, true)]
        [TestCase(1, false, false)]
        [TestCase(2, false, false)]
        [TestCase(3, false, false)]
        public void GetWebApiResourceResultOnError_AccessTokenExpired_ReturnsExpectedResult(Int32 attempt,
            Boolean expectNullJsonResult, Boolean expectedGetNewTokenFlag)
        {
            /* Arrange */
            var ex = new WebApiException()
            {
                StatusCode = HttpStatusCode.Unauthorized,
                AccessTokenExpiredOrInvalid = true
            };

            /* Act */
            Boolean getNewAccessToken;
            var result = WebApiController.GetWebApiResourceResultOnError(ex, attempt, out getNewAccessToken);

            /* Assert */
            Assert.That(result, expectNullJsonResult ? Is.Null : Is.Not.Null);
            Assert.That(getNewAccessToken, Is.EqualTo(expectedGetNewTokenFlag));
        }
        #endregion
    }
}
