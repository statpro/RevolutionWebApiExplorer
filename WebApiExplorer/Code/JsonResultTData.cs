using System;
using System.Web.Mvc;

namespace StatPro.Revolution.WebApiExplorer
{
    // Represents a strongly-typed JsonResult.
    public class JsonResult<TData> : JsonResult
    {
        // Default constructor.
        public JsonResult()
        {
        }

        // Constructor that initializes with strongly-typed data object.
        public JsonResult(TData typedData)
        {
            this.TypedData = typedData;
        }

        // Sets/gets the strongly-typed data object.
        public TData TypedData { get; set; }

        // Override ExecuteResult.
        public override void ExecuteResult(ControllerContext context)
        {
            this.Data = TypedData;
            base.ExecuteResult(context);
        }
    }
}
