import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function GlobalEmergencyAlert({ currentUser, onNavigate }) {
  const [latestAlert, setLatestAlert] = useState(null);
  const [dismissedAlertId, setDismissedAlertId] = useState(null);

  useEffect(() => {
    // Only check for doctors and admins
    if (!currentUser || currentUser.role === "patient") return;

    const checkAlerts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/emergency/alerts?unreadOnly=true`);
        const alerts = response.data.alerts || [];
        
        if (alerts.length > 0) {
          // Find the most recent critical/high alert or "New Emergency"
          const criticalAlerts = alerts.filter(a => a.alert_type === "New Emergency" || a.priority === "Critical");
          const alertToShow = criticalAlerts.length > 0 ? criticalAlerts[0] : alerts[0];
          
          if (alertToShow.alert_id !== dismissedAlertId) {
            setLatestAlert(alertToShow);
          }
        } else {
          setLatestAlert(null);
        }
      } catch (err) {
        console.error("Error fetching emergency alerts", err);
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [currentUser, dismissedAlertId]);

  if (!latestAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div 
        className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl cursor-pointer hover:bg-red-700 transition flex items-center gap-3 border-4 border-white max-w-sm"
        onClick={() => onNavigate("emergency", latestAlert.emergency_id)}
      >
        <span className="text-4xl">🚨</span>
        <div className="flex-1">
          <h4 className="font-bold text-lg leading-tight uppercase tracking-wide">
            {latestAlert.alert_type}
          </h4>
          <p className="text-sm text-red-100 mt-1 line-clamp-2">
            {latestAlert.message}
          </p>
          <p className="text-xs font-bold mt-2 text-white underline">
            Click to open Emergency Center
          </p>
        </div>
        <button 
          className="ml-2 bg-red-800/50 hover:bg-red-800 rounded-full w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition"
          onClick={(e) => {
            e.stopPropagation();
            setDismissedAlertId(latestAlert.alert_id);
            setLatestAlert(null);
          }}
          title="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default GlobalEmergencyAlert;
