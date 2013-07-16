using System;
using System.Text;
using System.Globalization;
using System.Diagnostics.CodeAnalysis;

namespace StatPro.Revolution.WebApiExplorer
{
    // Extension methods.
    public static class ExtensionMethods
    {
        // CSV-encode a string.
        public static String CsvEncode(this String value)
        {
            if (value == null)
                value = String.Empty;

            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        // Tries to parse the specified string as a date string in ISO 8601 date format (e.g "2012-05-17" = 
        // 17th May 2012).  If successful, returns true and passes the DateTime value back in 'dt'.  Returns false
        // if unsuccessful.
        public static Boolean TryParseFromIso8601DateFormat(this String value, out DateTime dt)
        {
            dt = DateTime.Now;

            if (String.IsNullOrEmpty(value))
                return (false);

            return (DateTime.TryParseExact(value, "yyyy'-'MM'-'dd", CultureInfo.InvariantCulture,
                                            DateTimeStyles.None, out dt));
        }

        // Returns the specified nullable-double as a string, using the default format and converted using
        // the specified culture.
        [SuppressMessage("Microsoft.Globalization", "CA1305:SpecifyIFormatProvider",
            MessageId = "System.Double.ToString",
            Justification = "Caller may have specified 'culture' as null.")]
        public static String NullableDoubleToString(this Double? value, IFormatProvider culture)
        {
            if (value == null)
                return String.Empty;
            else
            {
                if (culture == null)
                    return value.Value.ToString();
                else
                    return value.Value.ToString(culture);
            }
        }
        
        // Returns the specified nullable-int32 as a string, using the default format and converted using
        // the specified culture.
        [SuppressMessage("Microsoft.Globalization", "CA1305:SpecifyIFormatProvider",
            MessageId = "System.Int32.ToString",
            Justification = "Caller may have specified 'culture' as null.")]
        public static String NullableInt32ToString(this Int32? value, IFormatProvider culture)
        {
            if (value == null)
                return String.Empty;
            else
            {
                if (culture == null)
                    return value.Value.ToString();
                else
                    return value.Value.ToString(culture);
            }
        }

        // Base64-decodes 'b64Text', using the specified character encoding.
        // Returns 'defaultValue' if a decoding error occurs (e.g. 'b64Text' is null or doesn't contain a
        // valid base64-encoded string) or if no encoding is specified.
        public static String Base64Decode(this String b64Text, Encoding encoding, String defaultValue)
        {
            if (encoding == null)
                return defaultValue;

            try
            {
                return encoding.GetString(Convert.FromBase64String(b64Text));
            }
            catch (ArgumentException)
            {
                return defaultValue;
            }
            catch (FormatException)
            {
                return defaultValue;
            }
        }
    }
}
