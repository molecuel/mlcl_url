# Molecuel URL module

This module generates url and is a plugin for all elements in the molecuel CMS

The configuration happens via handlebars pattern and the helper named t

like: {{t title}}

The title is then automatically used as url.

If a url is changed the module automatically emits a event of the type mlcl::url::changedurl.
The options of the event are: urlmodule, modelname, dbobject, oldurl, newurl.