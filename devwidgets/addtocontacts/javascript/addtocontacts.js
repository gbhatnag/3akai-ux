/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

/*
 * Dependencies
 *
 * /dev/lib/misc/trimpath.template.js (TrimpathTemplates)
 * /dev/lib/jquery/plugins/jqmodal.sakai-edited.js
 */

/*global $, Config, sakai, History, opensocial, Widgets */
require(["jquery", "sakai/sakai.api.core"], function($, sakai) {
    /**
     * This is a widget that can be placed in other pages and widgets.
     * It shows an Add to contacts dialog.
     * All you have to do is provide a user object that contains:
     *  - first name
     *  - last name
     *  - uuid of the person you wish to add.
     *
     *  You can also set the personal note by using the setPersonalNote() method
     *  and select the type by using the setTypes().
     */
    sakai_global.addtocontacts = function(tuid, showSettings){


        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        // Help variables
        var me = sakai.data.me;
        var friend = false;
        var callbackWhenDone = false;
        var fadeOutTime = 1000; // The amount of time it takes to fade out the message and hide the layover.
        // CSS selectors
        var addToContacts = "#addtocontacts";
        var addToContactsClass = ".addtocontacts";

        var addToContactsAdd = addToContacts + "_add";
        var addToContactsDialog = addToContacts + "_dialog";
        var addToContactsDone = addToContacts + "_done";
        var addToContactsDoneContainer = addToContacts + "_done_container";

        // Form elements
        var addToContactsForm = addToContacts + "_form";
        var addToContactsFormButtonInvite = addToContactsForm + "_invite";
        var addToContactsFormButtonCancel = addToContactsForm + "_cancel";
        var addToContactsFormPersonalNote = addToContactsForm + "_personalnote";
        var addToContactsFormPersonalNoteTemplate = addToContactsFormPersonalNote + "_template";
        var addToContactsFormType = addToContactsForm + "_type";
        var addToContactsFormTypeTemplate = addToContactsFormType + "_template";
        // Profile info
        var addToContactsInfoProfilePicture = addToContacts + "_profilepicture";
        var addToContactsInfoTypes = addToContacts + "_types";
        var addToContactsInfoDisplayName = addToContactsClass + "_displayname";

        // Error messages
        var addToContactsError = addToContacts + "_error";
        var addToContactsErrorMessage = addToContactsError + "_message";
        var addToContactsErrorRequest = addToContactsError + "_request";
        var addToContactsErrorNoTypeSelected = addToContactsError + "_noTypeSelected";

        var addToContactsResponse = addToContacts + "_response";

        ///////////////////
        // Functionality //
        ///////////////////

        /**
         * Render the templates that are needed for the add contacts widget.
         * It renders the contacts types and the personal note
         */
        var renderTemplates = function(){
            sakai.api.Util.TemplateRenderer(addToContactsFormTypeTemplate.replace(/#/gi, ""), sakai.config.Relationships, $(addToContactsInfoTypes));
            var json = {
                sakai: sakai,
                me: me
            };
            sakai.api.Util.TemplateRenderer(addToContactsFormPersonalNoteTemplate.replace(/#/gi, ""), json, $(addToContactsFormPersonalNote));
        };

        /**
         * This method will fill in the info for the user.
         * @param {Object} user The JSON object containing the user info. This follows the /rest/me format.
         */
        var fillInUserInfo = function(user){
            if (user) {

                $(addToContactsInfoDisplayName).text(sakai.api.User.getDisplayName(user));

                // Check for picture
                if (user.picture && $.parseJSON(user.picture).name) {
                    $(addToContactsInfoProfilePicture).html('<img alt="' + $("#addtocontacts_profilepicture_alt").html() + '" src="/~' + user.uuid + "/public/profile/" + $.parseJSON(user.picture).name + '" width="60" height="60" />');
                }
                else {
                    $(addToContactsInfoProfilePicture).html('<img alt="' + $("#addtocontacts_profilepicture_alt").html() + '" src="' + sakai.config.URL.USER_DEFAULT_ICON_URL + '" width="60" height="60" />');
                }
            }
        };

        /**
         * This function looks up and retrieves relationship information from a set of pre-defined relationships
         * @param {String} relationshipName
         */
        var getDefinedRelationship = function(relationshipName){
            for (var i = 0, j = sakai.config.Relationships.contacts.length; i < j; i++) {
                var definedRelationship = sakai.config.Relationships.contacts[i];
                if (definedRelationship.name === relationshipName) {
                    return definedRelationship;
                }
            }
            return null;
        };

        /**
         * Does the invitation stuff. Will send a request for an invitation and a message to the user.
         * @param {String} userid
         */
        var doInvite = function(userid){
            var formValues = $(addToContactsForm).serializeObject();
            var types = formValues[addToContactsFormType.replace(/#/gi, "")];
            $(addToContactsResponse).text("");
            if (types.length) {
                var fromRelationshipsToSend = [];
                var toRelationshipsToSend = [];
                for (var i = 0, j = types.length; i < j; i++) {
                    var type = types[i];
                    fromRelationshipsToSend.push(type);
                    var definedRelationshipToSend = getDefinedRelationship(type);
                    if (definedRelationshipToSend && definedRelationshipToSend.inverse) {
                        toRelationshipsToSend.push(definedRelationshipToSend.inverse);
                    }
                    else {
                        toRelationshipsToSend.push(type);
                    }
                }

                var personalnote = formValues[addToContactsFormPersonalNote.replace(/#/gi, '')];

                // send message to other person
                var userstring = sakai.api.User.getDisplayName(me.profile);

                var title = $("#addtocontacts_invitation_title_key").html().replace(/\$\{user\}/g, userstring);
                var message = $("#addtocontacts_invitation_body_key").html().replace(/\$\{user\}/g, userstring).replace(/\$\{br\}/g,"\n") + "," + personalnote;

                // Do the invite and send a message
                $.ajax({
                    url: "/~" + sakai.data.me.user.userid + "/contacts.invite.html",
                    type: "POST",
                    traditional: true,
                    data: {
                        "fromRelationships": fromRelationshipsToSend,
                        "toRelationships": toRelationshipsToSend,
                        "targetUserId": userid
                    },
                    success: function(data){
                        $(addToContactsDialog).jqmHide();
                        sakai.api.Communication.sendMessage(userid, sakai.data.me.user.userid, title, message, "invitation");
                        callbackWhenDone(friend);
                        //reset the form to set original note
                        $(addToContactsForm)[0].reset();
                        sakai.api.Util.notification.show("", $(addToContactsDone).text());
                        // record that user made contact request
                        sakai.api.User.addUserProgress("madeContactRequest");
                        // display tooltip
                        var tooltipData = {
                            "tooltipSelector":"#search_button",
                            "tooltipTitle":"TOOLTIP_ADD_CONTACTS",
                            "tooltipDescription":"TOOLTIP_ADD_CONTACTS_P5",
                            "tooltipTop":-175,
                            "tooltipLeft":0,
                            "tooltipAutoClose":true
                        };
                        $(window).trigger("sakai-tooltip-update", tooltipData);
                    },
                    error: function(xhr, textStatus, thrownError){
                        $(addToContactsResponse).text(sakai.api.Security.saneHTML($(addToContactsErrorRequest).text()));
                    }
                });

            }
            else {
                $(addToContactsResponse).text(sakai.api.Security.saneHTML($(addToContactsErrorNoTypeSelected).text()));
            }
        };

        ///////////////////////
        // jqModal functions //
        ///////////////////////

        /**
         * This will load the overlay to add a new contact.
         * This method will fill in all the user info.
         * @param {Object} hash The layover object we get from jqModal
         */
        var loadDialog = function(hash){
            // Show the form
            $(addToContactsDoneContainer).hide();
            $(addToContactsAdd).show();

            hash.w.show();
        };

        ////////////////////
        // Public methods //
        ////////////////////

        /**
         * Set a personal note.
         * @param {string} note The text you wish to display in the note.
         */
        var setPersonalNote = function(note){
            $(addToContactsFormPersonalNote).val(note);
        };


        /////////////////////////
        // Initialise function //
        /////////////////////////

        /**
         * People should call this function if they want to initiate the widget
         * @param {Object} user The userid or the /rest/me info for this user.
         * @param {Function} callback The callback function that will be executed after the request.
         */
        var initialize = function(user, callback){
            callbackWhenDone = callback;
            // Check if we have a JSON object or a userid String.
            if (!user.preferences) {
                // This is a uuid. Fetch the info from /rest/me
                $.ajax({
                    url: "/~" + user + "/public/authprofile.infinity.json",
                    success: function(data){

                        friend = $.extend(data, {}, true);
                        friend.uuid = user;

                        // We have the data, render it.
                        fillInUserInfo(friend);
                    }
                });
            }
            else {
                friend = user;
                friend.uuid = user.preferences.uuid;
                fillInUserInfo(friend);
            }

            // Render the templates
            renderTemplates();

            // Show the layover
            $(addToContactsDialog).jqmShow();

            // Give the user options to manipulate this widget.
            return {
                "setPersonalNote": setPersonalNote
            };
        };

        $(window).bind("initialize.addToContacts.sakai", function(e, obj) {
            var user = obj.user;
            var callback = obj.callback;
            initialize(user, callback);
        });

        /////////////////////
        // Event listeners //
        /////////////////////

        // Bind the invite button
        $(addToContactsFormButtonInvite).bind("click", function(){
            // Invite this person.
            doInvite(friend.uuid);
        });

        // Bind the cancel button
        $(addToContactsFormButtonCancel).click(function(){
            $(addToContactsForm)[0].reset();

            // display tooltip
            var tooltipData = {
                "tooltipSelector":"#search_button",
                "tooltipTitle":"TOOLTIP_ADD_CONTACTS",
                "tooltipDescription":"TOOLTIP_ADD_CONTACTS_P3",
                "tooltipTop":-150,
                "tooltipLeft":-200
            };
            $(window).trigger("sakai-tooltip-update", tooltipData);
        });

        $(".jqmClose").bind("click", function(){
            // display tooltip
            var tooltipData = {
                "tooltipSelector":"#search_button",
                "tooltipTitle":"TOOLTIP_ADD_CONTACTS",
                "tooltipDescription":"TOOLTIP_ADD_CONTACTS_P3",
                "tooltipTop":-150,
                "tooltipLeft":-200
            };
            $(window).trigger("sakai-tooltip-update", tooltipData);
        });

        // Bind the jqModal
        $(addToContactsDialog).jqm({
            modal: true,
            overlay: 20,
            toTop: true,
            onShow: loadDialog
        });
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("addtocontacts");
});
