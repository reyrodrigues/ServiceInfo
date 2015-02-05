API
===

For the most part, the API uses the defaults of Django REST Framework
to provide access to the models in the usual way. You can browse
the API at `https://<yourserver>/api`.  This document will only
cover the little complications, like getting authenticated, creating
users, password reset, etc.

Ownership
---------

The API enforces ownership in a few places. When creating records that
are owned by a particular provider, the provider is forced to be that
of the currently authenticated user. Similarly, when querying records
of those models, only those owned by the currently authenticated user
are returned. The relevant record types are Service and SelectionCriterion
for creation, and those plus Provider for querying.

Creating a new provider
-----------------------

The usual way to create a new instance of a model would be to POST
to the model's list URL. However, for new provider registration, it's
necessary to be able to create a new provider when not authenticated,
and the usual APIs don't allow that. We also want to create both a
user and a provider record. So we've created a custom call
just for this.

To use it, POST to ``/api/provider/create_provider/``. The request data
is almost the same as it would be to create a Provider normally,
except instead of a 'user' field, it expects 'email' and 'password'
fields, plus a 'base_activation_link' field::

    {'email': 'user's email address',
     'password': 'plaintext password',
     'base_activation_link': 'used to build activation link',
     # remaining fields are for Provider, omitting 'user' field
    }

The 'email' and 'password' fields ought to be self-explanatory.

The 'base_activation_link' should be a URL that the activation key
can be appended to, giving the link the user should be sent to activate
their account.  E.g. base_activation_link might be "https://example.com/activate?key="
and then the API would append the actual key string ("XYZ") and send the result
("https://example.com/activate?key=XYZ") in the email to the user.
The resulting link should invoke the client, which should then use
the user activation API (see below) with the given key.

When the create_provider call is successful,
a new, inactive user will be created, and an email sent to the user with
the activation link.

Also, a new provider will be created for that user.

200 is returned and the response body is the
response from creating a provider, for example::

    {'description_ar': '',
     'description_en': 'Test provider',
     'description_fr': '',
     'id': 2,
     'name_ar': '',
     'name_en': 'Joe Provider',
     'name_fr': '',
     'number_of_monthly_beneficiaries': 37,
     'phone_number': '12345',
     'type': 'http://testserver/api/providertypes/2/',
     'url': 'http://testserver/api/providers/2/',
     'user': 'http://testserver/api/users/16/',
     'website': ''}

If there's a problem, 400 is returned and the response body might
be something like one of these::

    {'email': ['Enter a valid email address.']}
    {'email': ['This field may not be blank.']}
    {'password': ['This field may not be blank.']}

Resend activation link
----------------------

If a user has lost their activation link, the client can POST to
``/api/lost_activation_link/``::

    {'email': 'user's email address',
     'base_activation_link': 'used to build activation link',
    }

and if there's a account under that email waiting to be activated,
an email will be sent to that email containing an
activation link and a 200 returned. Otherwise, a 400 status
and error message will come back.  FILL ME IN.

User activation
---------------

If the client has a user activation key, the client can try to activate
the user by POSTing to ``/api/activate/`` with

    { 'activation_key': 'the key string' }

If successful, response status will be 200 and the response content will
include::

   { 'token': 'a long string',
     'email': 'the user's email address'}

The token can be used to make subsequent API calls with the permissions
of that user (see below).

Otherwise, the response status will be 400 and the body might
contain::

    {'activation_key': ['Activation key is invalid. Check that it was copied correctly '
                        'and has not already been used.']}
    {'activation_key': ['This field may not be blank.']}

Login
-----

If a client has a user's email and password, it can get an auth
token and use that in subsequent calls.

POST to '/api/login/'::

   { 'email': 'email@example.com',
     'password': 'plaintext password' }

If successful, response status will be 200 and the response
content will include::

   { 'token': 'a long string'}

If failed, response status will be 400 and the response might look like
one of these::

    {"non_field_errors": ["Unable to log in with provided credentials."]}
    {"email": ["This field may not be blank."]}
    {"non_field_errors": ["User account is disabled."]}

Using token-based auth
----------------------

Once the client has the token, it should pass it on subsequent requests per
http://www.django-rest-framework.org/api-guide/authentication/#tokenauthentication
which says::

    For clients to authenticate, the token key should be included in the
    Authorization HTTP header. The key should be prefixed by the string
    literal "Token", with whitespace separating the two strings. For example::

        Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

As you might expect, requests will be permitted or denied based on the
permissions of the user whose token is passed.

User language
-------------

The client can store and retrieve a short string containing the
code for the current user's preferred language::

     GET /api/language/
       --> {'language': 'en'}

     POST {'language': 'en'} to /api/language/

At present, the language code should be one of

* "en": English
* "ar": Arabic
* "fr": French

Password reset
--------------

If a user wants to reset their password, the client should POST to
``/api/password_reset_request/``::

    {'email': 'user@example.com',
     'base_reset_link': 'https://example.com/reset?key=',
    }

where email is the user's email. The server will generate a new
key (a long string that the client should not try to interpret),
specific for this user to reset their email, append it to
the base_reset_link, and email it to the given email address,
then return 200.  Or if there's no such user or other error,
return 400 and an error message.

The front end should arrange to handle the resulting URL.
Ask the user for a new password. Then POST to
``/api/password_reset/``::

    {'key': 'the password reset key',
     'password': 'the new password'}

If the response status is OK (200), then the body will have

    {'email': 'the user's email address',
     'token': 'a valid auth token for the user'}

Otherwise the status will be 400 and the body will have error
messages.  The reset can fail because the
key is missing, has the wrong syntax, is not recognized, has
already been used, has expired, etc::

    {"email": ["No user with that email"]}
    {"non_field_errors": ["Password reset key is not valid"]}


If the front end wants to check if the password reset key looks
like it's probably valid before prompting the user for a new
password, it can optionally POST to``/api/password_reset_check/``::

    {'key': 'the password reset key'}

and will get back OK if the key appears to be valid, and the
associated email address in the response::

    {'email': 'user@example.com'},

Otherwise,it'll get a 400 but no other data.

Cancel a Service
----------------

A provider can cancel a current service to withdraw it from the
directory, or cancel a service record that is in draft status to
cancel the requested new service or change.

The URL for this API is the service's URL with 'cancel/' appended.
POST to it to do the cancel.

On success it'll return a 200.  If the service isn't in a valid
state to be canceled, it'll return 400. If the service doesn't
belong to the provider making the call, it'll return a 404 (because
only services belonging to a provider are visible to the provider).