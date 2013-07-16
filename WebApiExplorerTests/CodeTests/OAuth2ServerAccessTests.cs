using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using NUnit.Framework;

using StatPro.Revolution.WebApiExplorer;

namespace StatPro.Revolution.WebApiExplorerTests.CodeTests
{
    [TestFixture]
    public class OAuth2ServerAccessTests
    {
        // Constructor.
        public OAuth2ServerAccessTests()
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

        #region GetErrorInfoFromErrorResponseJson Tests
        [TestCase(null)]
        [TestCase("")]
        [TestCase("  ")]
        [TestCase("hello")]
        [TestCase("{ }")]
        [TestCase("{ \"msg\": \"hello\" }")]
        [TestCase("{ \"error\": \"unknown_error\" }")]
        [TestCase("{ \"error\": \"INVALID_REQUEST\" }")]
        public void GetErrorInfoFromErrorResponseJson_NotOAuth2ErrorResponse_ReturnsNull(String content)
        {
            /* Arrange */

            /* Act */
            var result = OAuth2ServerAccess.GetErrorInfoFromErrorResponseJson(content);

            /* Assert */
            Assert.That(result, Is.Null);
        }

        [TestCase("{ \"error\": \"invalid_request\" }", "invalid_request")]
        [TestCase("{ \"error\": \"invalid_client\" }", "invalid_client")]
        [TestCase("{ \"error\": \"invalid_grant\" }", "invalid_grant")]
        [TestCase("{ \"error\": \"invalid_scope\" }", "invalid_scope")]
        [TestCase("{ \"error\": \"unsupported_grant_type\" }", "unsupported_grant_type")]
        [TestCase("{ \"error\": \"unauthorized_client\" }", "unauthorized_client")]
        [TestCase("{ \"error\": \"server_error\" }", "server_error")]
        public void GetErrorInfoFromErrorResponseJson_OAuth2ErrorResponse_ReturnsExpectedResult(String content,
            String errorCode)
        {
            /* Arrange */

            /* Act */
            var result = OAuth2ServerAccess.GetErrorInfoFromErrorResponseJson(content);

            /* Assert */
            Assert.That(result.Item1, Is.Not.Empty);
            Assert.That(result.Item2, Is.EqualTo(errorCode));
        }
        #endregion
    }
}
