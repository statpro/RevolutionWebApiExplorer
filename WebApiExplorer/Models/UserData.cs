using System;
using System.Diagnostics.CodeAnalysis;

using Newtonsoft.Json.Linq;

namespace StatPro.Revolution.WebApiExplorer.Models
{
    // Represents the data that we persist about a logged-on user.
    // Currently all of this data is provided by the StatPro Revolution OAuth2 Server.
    [Serializable]
    public class UserData
    {
        // Constructor.
        public UserData()
        {
        }

        #region Properties
        // Sets/gets the base64-encoded access token.
        public String AccessToken { get; set; }

        // Sets/gets the date/time at which the access token was issued.
        public DateTime AccessTokenIssuedAt { get; set; }

        // Sets/gets the access token's lifetime, in seconds.
        public Int32 ExpiresIn { get; set; }

        // Sets/gets the refresh token.
        public String RefreshToken { get; set; }

        // Sets/gets the user's unique, external identifier.
        public String UserIdentifier { get; set; }

        // Sets/gets the user's display name (not unique).
        public String UserName { get; set; }
        #endregion

        #region Methods
        // Creates and returns a new UserData object from the specified JSON content, which is expected to have
        // been returned by the OAuth2 Server in response to a request for an access token (whether via an 
        // authorization code or a refresh token).  Returns null if 'jsonContent' is null, empty, whitespace,
        // or contains invalid/unrecognised data.
        //
        // Expected _format_ of the JSON content:-
        //     {
        //         "access_token": "<base64-encoded access token>",
        //         "token_type": "Bearer",
        //         "expires_in": 3600,
        //         "scope": "RevolutionWebApi",
        //         "refresh_token": "a_refresh_token",
        //         "user_id": "4289ee5d82e3d8fb48ce4048e82344bc44ced59122a34db287c2457379aeb3e9",
        //         "user_name": "A Person"
        //     }
        //
        [SuppressMessage("Microsoft.Design", "CA1031:DoNotCatchGeneralExceptionTypes",
            Justification = "Not sure what exceptions Newtonsoft.Json can throw.")]
        public static UserData DeserializeOAuth2ServerResponse(String jsonContent)
        {
            if (String.IsNullOrWhiteSpace(jsonContent))
                return null;

            try
            {
                // Parse the JSON.
                var jObj = JObject.Parse(jsonContent);

                // Create UserData object, and populate the properties.
                var user = new UserData()
                {
                    AccessToken = (String)jObj["access_token"],
                    AccessTokenIssuedAt = DateTime.UtcNow,
                    ExpiresIn = (Int32)jObj["expires_in"],
                    RefreshToken = (String)jObj["refresh_token"],
                    UserIdentifier = (String)jObj["user_id"],
                    UserName = (String)jObj["user_name"]
                };

                // Basic validation.
                if (String.IsNullOrWhiteSpace(user.AccessToken))
                    return null;
                if (user.ExpiresIn <= 0)
                    return null;
                if (String.IsNullOrWhiteSpace(user.RefreshToken))
                    return null;
                if (String.IsNullOrWhiteSpace(user.UserIdentifier))
                    return null;
                if (user.UserName == null)
                    return null;

                // Return.
                return user;
            }

            // Not sure what exceptions Newtonsoft.Json can throw, so will have to catch any/all.
            catch (Exception)
            {
                return null;
            }
        }
        #endregion
    }
}
