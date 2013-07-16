using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;

using NUnit.Framework;
using NSubstitute;

using StatPro.Revolution.WebApiExplorer.Controllers;

namespace StatPro.Revolution.WebApiExplorerTests.ControllerTests
{
    [TestFixture]
    public class OAuth2ControllerTests : BaseControllerTests
    {
        // Constructor.
        public OAuth2ControllerTests()
        {
        }

        #region GetAuthorizationRequestInfo Tests
        [Test]
        public void GetAuthorizationRequestInfo_AppSettings_ReturnsExpectedResult()
        {
            /* Arrange */
            var appSettings = _substituteAppSettings;
            appSettings.OAuth2ServerAuthorizationEndpointUri.Returns("https://revapiaccess.statpro.com/OAuth2/Authorization");
            appSettings.ClientApplicationPublicId.Returns("MyAppPublicId");
            appSettings.ClientApplicationRedirectUri.Returns("https://myapp.com/OAuth2/ReceiveAuthCode");
            appSettings.RevolutionResourceServers.Returns("RevolutionWebApi");

            /* Act */
            var result = OAuth2Controller.GetAuthorizationRequestInfo(appSettings);

            /* Assert */
            var expectedUri = "https://revapiaccess.statpro.com/OAuth2/Authorization?response_type=code&client_id=MyAppPublicId&redirect_uri=https%3A%2F%2Fmyapp.com%2FOAuth2%2FReceiveAuthCode&scope=RevolutionWebApi&state=";
            Assert.That(result, Is.Not.Null);
            Assert.That(result.Item1, Is.EqualTo(expectedUri + result.Item2.ToString(CultureInfo.InvariantCulture)));
        }
        #endregion
    }
}
