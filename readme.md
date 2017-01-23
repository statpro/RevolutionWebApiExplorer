
# Introduction #

This repository contains the source code for the [StatPro Revolution Web API Explorer](https://revapiexplorer.statpro.com) web application.
 
The StatPro Revolution Web API Explorer allows users to extract their Revolution data from the Revolution Web API interactively, using a simple web interface.  It allows you to explore the features of the Web API, and shows what types of data the Web API can (and by inference) can't extract.

The Web API Explorer exposes only a subset of available functionality of the StatPro Revolution Web API, intended for illustrative and tutorial purposes.

The source code for the Web API Explorer is provided as Open Source under the MIT License.

*You should not expect the application as listed here to build and/or run successfully.  Various items of information relating to security have been intentionally removed from this version.*


# Revolution Web API #

The StatPro Revolution Web API allows client applications to access user data from the [StatPro Revolution system](http://www.statpro.com/cloud-based-portfolio-analysis/revolution/) programmatically.

User authentication and authorization is handled by StatPro OAuth2 Server, which in the case of Server-side Web applications (as well as Native applications) uses OAuth 2.0's 'Authorization Code' flow.

To run your own Server-side Web application, you must first register it with StatPro.

For more information:-
* [Revolution Web API](http://developer.statpro.com/Revolution/WebApi/Intro)
* [Revolution OAuth2 Server](http://developer.statpro.com/Revolution/WebApi/Authorization/Overview)
* [Registering your own application](http://developer.statpro.com/Revolution/WebApi/Authorization/Registration)
* [Server-Side Web applications](http://developer.statpro.com/Revolution/WebApi/Authorization/ServerSideWebApps)
* [OAuth 2.0](http://tools.ietf.org/html/rfc6749)
* [OAuth 2.0 Threat Model and Security Considerations](http://tools.ietf.org/html/rfc6819)
* [Revolution Web API and OAuth2 Support](mailto:webapisupport@statpro.com)


# What the code demonstrates #

The application's source code shows developers how to:-
* write a Server-side Web Application that interacts with the StatPro Revolution OAuth2 Server (using the OAuth 2.0 'Authorization Code' flow) to get access tokens and refresh tokens
* get data from the Web API using an access token
* follow the approved [workflow](http://developer.statpro.com/Revolution/WebApi/Intro#started) for accessing resources that are exposed by the Web API
* get [portfolios](http://developer.statpro.com/Revolution/WebApi/Resource/Portfolios), [analysis](http://developer.statpro.com/Revolution/WebApi/Resource/PortfolioAnalysis) and results data from the Web API
* detect if the Web API has returned one of its [specific errors](http://developer.statpro.com/Revolution/WebApi/Intro#statusCodes)
* detect request blockage by the Web API due to a [Fair Usage Policy violation](http://developer.statpro.com/Revolution/WebApi/FairUsagePolicy)
* detect if the Web API has [rejected the access token because it has expired](http://developer.statpro.com/Revolution/WebApi/Authorization/ServerSideWebApps#step5)
* get a [new access token from a refresh token](http://developer.statpro.com/Revolution/WebApi/Authorization/ServerSideWebApps#step5)
* [re-prompt the user for access](http://developer.statpro.com/Revolution/WebApi/Authorization/ServerSideWebApps#step1) if getting an access token from a refresh token fails
* get [requestable analytics measures](http://developer.statpro.com/Revolution/WebApi/Intro#measures) programmatically, in XML format.


# Guide to the code #

On the server-side, the application is written using C# 5, .NET 4.5 and ASP.NET MVC 4.  The website's views use Razor.

It is on the server that the code talks to the OAuth2 Server and the Web API; the client-side code (i.e. JavaScript) is not able to do either of these things because:-
* the StatPro Revolution OAuth2 Server does not support the OAuth 2.0 'Implicit Grant' flow
* the browser's Same Origin policy only allows the JavaScript to talk to its own webserver via AJAX
* JSONP cannot be used to talk to the Web API due to the need to set to request headers (e.g. to specify the access token) 
* the Web API does not support CORS.

The main logic of the application is in the client-side code, which essentially uses the webserver as a proxy for talking to the OAuth2 Server and the Web API.  These two tasks are performed by the code in the following files:-
* Code\Decoupling\Implementations\OAuth2ServerAccess.cs
* Code\Decoupling\Implementations\WebApiAccess.cs
* Code\Decoupling\Implementations\GlobalStateAccess.cs


# Caveats #

This repository may not reflect the latest version of the StatPro Revolution Web API Explorer website.

The Visual Studio solution in this repository is a cut-down version of the full solution.  Various items of information relating to application security (including the OAuth 2.0 client secret) have been removed. 

The Web API Explorer does not surface every single feature of the Revolution Web API.  See the Web API's [documentation website](http://developer.statpro.com/Revolution/WebApi/Intro) for full details of its capabilities.  


# License #

(c) Copyright 2013-2017 StatPro Ltd. - a member of StatPro Group plc

<p>Permission is hereby granted, free of charge, to any person obtaining a copy<br />
of this software and associated documentation files (the "Software"), to deal<br />
in the Software without restriction, including without limitation the rights<br />
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell<br />
copies of the Software, and to permit persons to whom the Software is<br />
furnished to do so, subject to the following conditions:</p>
<p>The above copyright notice and this permission notice shall be included in<br />
all copies or substantial portions of the Software.</p>
<p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR<br />
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,<br />
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE<br />
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER<br />
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,<br />
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN<br />
THE SOFTWARE.</p>
