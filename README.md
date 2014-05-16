[![Build Status](https://travis-ci.org/molecuel/mlcl_url.svg?branch=master)](https://travis-ci.org/molecuel/mlcl_url)

[![NPM](https://nodei.co/npm-dl/mlcl_url.png?months=1)](https://nodei.co/npm/mlcl_url/)

[![NPM](https://nodei.co/npm/mlcl_url.png?downloads=true&stars=true)](https://nodei.co/npm/mlcl_url/)

[![NPM version](https://badge.fury.io/js/mlcl_url@2x.png)](http://badge.fury.io/js/mlcl_url)

# Molecuel URL module

This module generates url and is a plugin for all elements in the molecuel CMS

The configuration happens via handlebars pattern and the helper named t

like: {{t title}}

The title is then automatically used as url.

If a url is changed the module automatically emits a event of the type mlcl::url::changedurl.
The options of the event are: urlmodule, modelname, dbobject, oldurl, newurl.