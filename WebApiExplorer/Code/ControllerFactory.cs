using System;
using System.Web.Mvc;
using System.Web.Routing;

using Ninject;

namespace StatPro.Revolution.WebApiExplorer
{
    // The website's own controller factory.
    public class ControllerFactory : DefaultControllerFactory
    {
        private static IKernel _ninjectKernel;

        // Constructor.
        public ControllerFactory()
        {
        }

        // Global.asax should set this property before the first controller is created to tell this class which
        // instance of the Ninject kernel to use for creating controllers.
        internal static IKernel NinjectKernel
        {
            set
            {
                _ninjectKernel = value;
            }

            get
            {
                return (_ninjectKernel);
            }
        }

        // Gets a controller instance.
        protected override IController GetControllerInstance(RequestContext requestContext, Type controllerType)
        {
            // If no controller type...
            if (controllerType == null)
                return (base.GetControllerInstance(requestContext, controllerType));

            // Get the Ninject kernel to create the controller.
            var controller = _ninjectKernel.Get(controllerType) as IController;

            // Return the Ninject-created controller, or if this failed, get the base to do the creation.
            return (controller ?? base.GetControllerInstance(requestContext, controllerType));
        }
    }
}
