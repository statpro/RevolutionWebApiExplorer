using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;

using NUnit.Framework;

using StatPro.Revolution.WebApiExplorer;

namespace StatPro.Revolution.WebApiExplorerTests.CodeTests
{
    [TestFixture]
    public class WebApiAccessTests
    {
        // Constructor.
        public WebApiAccessTests()
        {
        }

        #region Setup_Teardown
        [SetUp]
        public void Setup()
        {
        }

        [TearDown]
        public void TearDown()
        {
        }
        #endregion

        #region GetErrorInformation Tests
        [TestCase(null, "", null, null)]
        [TestCase("", "", null, null)]
        [TestCase(" ", " ", null, null)]
        [TestCase("Bad Request", "Bad Request", null, null)]
        [TestCase("The value of the portfolios $filter query string is too long. (REVAPI_ERROR=801)",
                  "The value of the portfolios $filter query string is too long.",
                   WebApiErrorCode.PortfoliosFilterStringTooLong, null)]
        [TestCase("Unrecognised message. (REVAPI_ERROR=100)",
                  "Unrecognised message.", null, 100)]
        [TestCase("Close, but no cigar.(REVAPI_ERROR=100)",
                  "Close, but no cigar.(REVAPI_ERROR=100)", null, null)]
        public void GetErrorInformation_ReasonPhrase_ReturnsExpectedResults(String reasonPhrase, String errorMessage,
            WebApiErrorCode? webApiErrorCode, Int32? unrecognisedErrorCode)
        {
            /* Arrange */

            /* Act */
            var result = WebApiAccess.GetErrorInformation(reasonPhrase);

            /* Assert */
            Assert.That(result.Item1, Is.EqualTo(errorMessage));
            Assert.That(result.Item2, Is.EqualTo(webApiErrorCode));
            Assert.That(result.Item3, Is.EqualTo(unrecognisedErrorCode));
        }
        #endregion

        #region IsAccessTokenExpiredOrInvalid Tests
        [TestCaseSource("IsAccessTokenExpiredOrInvalidTestCases")]
        public void IsAccessTokenExpiredOrInvalid_HttpResponseMessage_ReturnsExpectedResult(
            HttpResponseMessage responseMessage, Boolean expectedResult)
        {
            /* Arrange */

            /* Act */
            var result = WebApiAccess.IsAccessTokenExpiredOrInvalid(responseMessage);

            /* Assert */
            Assert.That(result, Is.EqualTo(expectedResult));
        }

        private IEnumerable IsAccessTokenExpiredOrInvalidTestCases()
        {
            yield return new Object[2]
            {
                null,
                false,
            };

            yield return new Object[2]
            {
                new HttpResponseMessage (HttpStatusCode.OK),
                false,
            };

            yield return new Object[2]
            {
                new HttpResponseMessage (HttpStatusCode.BadRequest),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse(),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Basic"),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Basic", "QWxhZGRpbjpvcGVuIHNlc2FtZQ=="),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Bearer"),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Bearer", "some random error message"),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Bearer", "realm=\"example\", error=\"invalid_request\", " +
                    "error_description=\"Invalid request\""),
                false,
            };

            yield return new Object[2]
            {
                GetUnauthorizedResponse("Bearer", "realm=\"example\", error=\"invalid_token\", " +
                    "error_description=\"The access token expired\""),
                true,
            };
        }

        private HttpResponseMessage GetUnauthorizedResponse(String scheme = null, String parameter = null)
        {
            var response = new HttpResponseMessage(HttpStatusCode.Unauthorized);

            if (!String.IsNullOrWhiteSpace(scheme))
            {
                if (String.IsNullOrWhiteSpace(parameter))
                    response.Headers.WwwAuthenticate.Add(new AuthenticationHeaderValue(scheme));
                else
                    response.Headers.WwwAuthenticate.Add(new AuthenticationHeaderValue(scheme, parameter));
            }

            return response;
        }
        #endregion
    }
}
