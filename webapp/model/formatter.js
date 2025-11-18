sap.ui.define(
	[ "sap/ui/core/format/DateFormat"],
	function (DateFormat) {
		"use strict";
		return {
			dateTimeFormatter: function (oDate, oTime) {
				if (!oDate || !oTime || !oTime.ms) return "";

				// Combine date and time
				let oDateTime = new Date(oDate);
				oDateTime.setHours(0, 0, 0, 0);
				oDateTime = new Date(oDateTime.getTime() + oTime.ms);

				// Format using DateFormat (e.g., "Mon Jul 28, 2025, 2:30 PM")
				const oDateTimeFormat = DateFormat.getDateTimeInstance({
					pattern: "EEE MMM dd yyyy, hh:mm a"
				});
				const sFormattedDate = oDateTimeFormat.format(oDateTime);

				// Days difference
				const now = new Date();
				now.setHours(0, 0, 0, 0); // Normalize to midnight
				const diffDays = Math.floor((oDateTime - now) / (1000 * 60 * 60 * 24));

				let sAgo;
				if (diffDays === 0) {
					sAgo = "(Today)";
				} else if (diffDays > 0) {
					sAgo = `(${diffDays} Day${diffDays > 1 ? "s" : ""} Later)`;
				} else {
					sAgo = `(${Math.abs(diffDays)} Day${Math.abs(diffDays) > 1 ? "s" : ""} Ago)`;
				}

				return `${sFormattedDate} ${sAgo}`;
			},
			priorityFormatter: function (sPriority) {
				// Ensure it's a number
				let iPriority = parseInt(sPriority, 10);
				if (iPriority >= 5) {
					return sap.ui.core.Priority.Medium;
				} else if (iPriority >= 3) {
					return sap.ui.core.Priority.Medium;
				} else {
					return sap.ui.core.Priority.Low;
				}
			},
			authorInitials:function(sUserId){
				if (sUserId) {
					return sUserId.charAt(0).toUpperCase(); // Ensure it's uppercase
				}
				return "";
			}
		}
	}
);