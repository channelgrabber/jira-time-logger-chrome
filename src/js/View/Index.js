/**
 * Index.js file
 *
 * Contains the Index class.
 *
 * @author Aaron Baker <me@aaronbaker.co.uk>
 * @copyright Aaron Baker 2014
 */

define([
    'jqueryColor',
    'Container/Factory',
    'ActivityLog',
    'JiraConstants',
    'Config'
], function(
    $,
    containerFactory,
    AL,
    JiraConstants,
    config
) {

    /**
     * Index class
     *
     * Handles manipulating the HTML view on the main page
     *
     * @constructor
     */
    function Index()
    {
        /**
         * @type Integer
         * @private
         */
        var timeManualTimeout = null;
        /**
         * @type Integer
         * @private
         */
        var issueTimeout = null;

        /**
         * @type Container/Abstract
         * @private
         */
        var container = containerFactory.get();

        /**
         * Get the manual time timeout
         *
         * @return Integer
         */
        this.getTimeManualTimeout = function()
        {
            return timeManualTimeout;
        };

        /**
         * Set the manual time timeout
         *
         * @param Integer newTimeManualTimeout
         * @returns self
         */
        this.setTimeManualTimeout = function(newTimeManualTimeout)
        {
            timeManualTimeout = newTimeManualTimeout;
            return this;
        };

        /**
         * Get the issue timeout
         *
         * @return Integer
         */
        this.getIssueTimeout = function()
        {
            return issueTimeout;
        };

        /**
         * Set the issue timeout
         *
         * @param Integer newIssueTimeout
         * @returns self
         */
        this.setIssueTimeout = function(newIssueTimeout)
        {
            issueTimeout = newIssueTimeout;
            return this;
        };

        /**
         * Get the container instance
         *
         * @returns Container/Abstract
         */
        this.getContainer = function()
        {
            return container;
        };

        /**
         * Get the Application instance
         *
         * @returns App
         */
        this.getApp = function()
        {
            return this.getContainer().getAppInstance();
        };

        /**
         * Get the config
         *
         * @returns Config
         */
        this.getConfig = function()
        {
            return config;
        };
    }

    /**
     * @constants
     */
    Index.AL_COLOUR_MAP = {};
    Index.AL_COLOUR_MAP[AL.LEVEL_INFO] = '#5bb75b';
    Index.AL_COLOUR_MAP[AL.LEVEL_WARN] = '#f6b83f';
    Index.AL_COLOUR_MAP[AL.LEVEL_ERROR] = '#b75b5b';

    /**
     * Initialise the view
     *
     */
    Index.prototype.init = function()
    {
        var self = this;
        $(document).ready(function()
        {
            self._populateActivityLog()
                ._setVersion()
                ._setCopyrightYear()
                .updateTimeAuto()
                .updateLoggedTotal()
                .updateDayGrandTotal();
        });
    };

    /**
     * Log a message to the activity log
     *
     * @param ActivityLog activityLog
     * @param Bool animate Animate the adding of the message? Default: true
     */
    Index.prototype.addActivityLog = function(activityLog, animate)
    {
        animate = (animate === undefined ? true : animate);
        var message = activityLog.getMessage();
        var level = activityLog.getLevel();
        var dateTimeLogged = activityLog.getDateTimeLogged();

        message = message.replace(/\n/g, '; ');
        level = (level) ? level : AL.LEVEL_INFO;
        dateTimeLogged = dateTimeLogged.toLocaleString();

        var userLog = $('<div class="userLog '+level.toLowerCase()+'" title="'+dateTimeLogged+'">'+level+': '+message+'</div>');
        $('#userLogContainer').prepend(userLog).scrollTop(0);
        if (!animate) {
            return;
        }
        var colour = Index.AL_COLOUR_MAP[level];
        userLog.css({backgroundColor: colour})
                .show()
                .animate({backgroundColor: 'none'}, 1500);
    };

    /**
     * Remove an entry from the activity log
     *
     * @param ActivityLog message
     */
    Index.prototype.removeActivityLog = function(activityLog)
    {
        $('.userLog[title="'+activityLog.getDateTimeLogged().toLocaleString()+'"]').remove();
    };

    /**
     * Show manual time entry
     *
     */
    Index.prototype.showTimeManual = function()
    {
        if ($('#timeManual').is(':visible')) {
            return;
        }
        $('#timeAuto').hide();
        $('#timeManual').show().focus();
        $('#clearTimeButton').text('Cancel');
    };

    /**
     * Show automaticly calculated time
     *
     */
    Index.prototype.showTimeAuto = function()
    {
        if ($('#timeAuto').is(':visible')) {
            return;
        }
        $('#timeManual').val('').keyup().hide();
        $('#timeAuto').show();
        $('#clearTimeButton').text('Reset');
    };

    /**
     * Handle a time being manually entered
     *
     */
    Index.prototype.manualTimeEntered = function()
    {
        if (this.getTimeManualTimeout()) {
            clearTimeout(this.getTimeManualTimeout());
        }
        var timeManualTimeout = setTimeout(function()
        {
            if (!$('#timeManual').val().match(new RegExp(JiraConstants.TIME_REGEX))) {
                $('#timeManual').parent().parent().parent().addClass('danger');
            } else {
                $('#timeManual').parent().parent().parent().removeClass('danger');
            }
        }, 500);
        this.setTimeManualTimeout(timeManualTimeout);
    };

    /**
     * Handle an issue key being entered
     *
     */
    Index.prototype.issueKeyEntered = function()
    {
        if (this.getIssueTimeout()) {
            clearTimeout(this.getIssueTimeout());
        }
        $('#summary').text('*Waiting...*');
        var self = this;
        var issueTimeout = setTimeout(function()
        {
            var issueKey = $('#issue').val();
            if (issueKey.match(new RegExp(JiraConstants.ISSUE_KEY_REGEX))) {
                self._checkIssueKey(issueKey);
                return;
            }
            if ($.isNumeric(issueKey)) {
                var defaultProjectKey = self.getConfig().get('defaultProjectKey', 'jtl');
                if (defaultProjectKey) {
                    issueKey = defaultProjectKey + '-' + issueKey;
                    $('#issue').val(issueKey);
                    self._checkIssueKey(issueKey);
                    return;
                }
            }

            $('#issue').parent().addClass('danger');
            $('#summary').html('*Invalid issue key*');
        }, 500);
        this.setIssueTimeout(issueTimeout);
    };

    /**
     * Set an issue key
     *
     * @param String issue
     */
    Index.prototype.enterIssueKey = function(issue)
    {
        $('#issue').val(issue);
        $('#issue').keyup();
    };

    /**
     * Trigger submission of the time form
     *
     */
    Index.prototype.submitTimeForm = function()
    {
        $('#loggerForm').submit();
    };

    /**
     * Validate the time form
     *
     * @returns Array Errors
     */
    Index.prototype.validateTimeForm = function()
    {
        var app = this.getApp();
        $('#loggerForm li.danger').removeClass('danger');
        var errors = [];
        if (app.getTimeManual()) {
            if (!$('#timeManual').val().match(new RegExp(JiraConstants.TIME_REGEX)) || $('#timeManual').val() == '') {
                $('#timeManual').parent().parent().parent().addClass('danger');
                errors.push('\''+$('#timeManual').val()+'\' does not appear to be a valid JIRA time phrase');
            }
        }
        if (!$('#issue').val().match(new RegExp(JiraConstants.ISSUE_KEY_REGEX)) || $('#issue').val() == '') {
            $('#issue').parent().addClass('danger');
            errors.push('\''+$('#issue').val()+'\' does not appear to be a valid JIRA issue key');
        }

        return errors;
    };

    /**
     * Get all the values of the form
     *
     * @returns Object Field name / value pairs
     */
    Index.prototype.getTimeFormValues = function()
    {
        var app = this.getApp();
        var values = {};
        $('#loggerForm').find('input, select, textarea').each(function() {
            values[$(this).attr('name')] = $(this).val();
            if ($(this).attr('type') === 'checkbox') {
                if ($(this).is(':checked')) {
                    values[$(this).attr('name')] = true;
                } else {
                    values[$(this).attr('name')] = false;
                }
            }
        });

        var roundToNearest = 'min';
        values.time = (app.getTimeManual() ? $('#timeManual').val() : app.getTimeAutoAsString(roundToNearest));
        var summary = $('#summary').text();
        if (summary != '' && summary.indexOf(values.issue) < 0 && summary.indexOf('...') < 0) {
            values.summary = summary;
        }

        return values;
    };

    /**
     * Reset the values of the form
     *
     */
    Index.prototype.resetTimeForm = function()
    {
        $('#loggerForm li.danger').removeClass('danger');
        $('#summary').html('&nbsp;');
        $('#loggerForm').get(0).reset();
        this.showTimeAuto();
    };

    /**
     * Show a message to say the JIRA connection is being tested
     *
     */
    Index.prototype.showJiraTestMessage = function()
    {
        var mask = '<div id="mask">'
        mask += '<div id="maskText">Testing JIRA connection, please wait<br />';
        mask += '<img src="images/spinner.gif" alt="*" width="16" height="16" /></div>';
        mask += '</div>';
        $('body').append(mask);
    };

    /**
     * Hide the JIRA test message
     *
     */
    Index.prototype.hideJiraTestMessage = function()
    {
        $('#mask').remove();
    };

    /**
     * Update the logged total value
     *
     * @param String total
     * @returns self
     */
    Index.prototype.updateLoggedTotal = function(total)
    {
        total = total || this.getApp().getLoggedTotalAsString();
        $('#loggedTotal').text(total);
        return this;
    };

    /**
     * Update the daily grand total value
     *
     * @param String total
     * @returns self
     */
    Index.prototype.updateDayGrandTotal = function(total)
    {
        total = total || this.getApp().getDayGrandTotalAsString();
        $('#dayGrandTotal').text(total);
        return this;
    };

    /**
     * Update the auto time value
     *
     * @param String time
     * @returns self
     */
    Index.prototype.updateTimeAuto = function(time)
    {
        time = time || this.getApp().getTimeAutoAsString();
        $('.timeAuto').text(time);
        return this;
    };

    /**
     * React to the config being changed
     */
    Index.prototype.configChanged = function()
    {
        this.getConfig().load();
    };

    /**
     * Show a confirmation asking the user if they want to reset the total logged time
     */
    Index.prototype.confirmLoggedTimeReset = function()
    {
        var app = this.getApp();
        this.getContainer().confirm(
            "It looks like this is a new day,\ndo you want to reset the logged total as well?",
            function() {
                app.resetLoggedTotal(true);
            }
        );
    };

    /*
     * Private methods
     *
     * No such thing in JavaScript, just conceptual
     */

    /**
     * Set the version string
     *
     * @returns self
     * @private
     */
    Index.prototype._setVersion = function()
    {
        var version = this.getApp().getVersion();
        $('#version').text('v'+version);
        return this;
    };

    /**
     * Set the copyright year
     *
     * @returns self
     * @private
     */
    Index.prototype._setCopyrightYear = function()
    {
        var date = new Date();
        $('#copyYear').text(date.getFullYear());
        return this;
    };

    /**
     * Populate the activity log
     *
     * @returns self
     * @private
     */
    Index.prototype._populateActivityLog = function()
    {
        var logs = this.getApp().getActivityLogs();
        var animate = false;
        for (var index in logs) {
            this.addActivityLog(logs[index], animate);
        }
        return this;
    };

    /**
     * Check an issue key against JIRA and update the summary info
     *
     * @param String issueKey
     * @returns self
     */
    Index.prototype._checkIssueKey = function(issueKey)
    {
        $('#issue').parent().removeClass('danger');
        $('#summary').text('*Checking...*');
        var summary = this.getApp().getIssueSummary(issueKey, function(summary)
        {
            summary = (summary || issueKey + ' not found');
            $('#summary').text(summary);
        });
        return this;
    };

    return new Index();
});