using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using NUnit.Framework;
using NSubstitute;

using StatPro.Revolution.WebApiExplorer;

namespace StatPro.Revolution.WebApiExplorerTests.ControllerTests
{
    // Base class for the controller tests.  Creates and destroys all the subsitutes we need for every test.
    public abstract class BaseControllerTests
    {
        protected IAppSettingsAccess _substituteAppSettings;

        // Constructor.
        protected BaseControllerTests()
        {
        }

        #region Setup_Teardown
        [SetUp]
        public void Setup()
        {
            _substituteAppSettings = Substitute.For<IAppSettingsAccess>();
        }

        [TearDown]
        public void TearDown()
        {
            _substituteAppSettings = null;
        }
        #endregion
    }
}
