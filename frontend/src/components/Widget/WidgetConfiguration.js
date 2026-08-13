import React, { useState } from "react";
import { useEffect } from "react";
import Widget from "./Widget";

function WidgetConfiguration() {
    const [config, setConfig] = useState(null);


        useEffect(() => {
        fetch("http://localhost:8000/widget-config")
            .then(res => res.json())
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    setConfig(data);
                } else {
                    // Fallback to default if configuration is empty
                    setConfig({
                        primaryColor: "#46d8e5",
                        botName: "AI Assistant",
                        welcomeMessage: "Hi!",
                        buttonPosition: "right",
                        widgetSize: "medium",
                        avatarUrl: ""
                    });
                }
            })
            .catch(err => {
                console.log(err);
                // Fallback to default on fetch failure
                setConfig({
                    primaryColor: "#46d8e5",
                    botName: "AI Assistant",
                    welcomeMessage: "Hi!",
                    buttonPosition: "right",
                    widgetSize: "medium",
                    avatarUrl: ""
                });
            });
    }, []);


   const handleSave = async () => {

    const token = localStorage.getItem("authToken");

    const response = await fetch(
        "http://localhost:8000/widget-config",
        {
            method:"PUT",

            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`
            },

            body:JSON.stringify(config)
        }
    );

    const data = await response.json();

    if (response.ok) {
    alert("Configuration Saved Successfully!");
} else {
    alert("Failed to save configuration.");
}
}
    if (!config) {
        return <div style={{ padding: "40px", color: "white" }}>Loading configuration...</div>;
    }

    return (

        <div className="widget-config">

    <h2>Widget Configuration</h2>

    <div className="config-group">
        <label>Widget Name</label>
        <input
    type="text"
    value={config.botName}
    onChange={(e)=>
        setConfig({
            ...config,
            botName:e.target.value
        })
    }
/>
    </div>

    <div className="config-group">
        <label>Welcome Message</label>
        <textarea
    value={config.welcomeMessage}
    onChange={(e)=>
        setConfig({
            ...config,
            welcomeMessage:e.target.value
        })
    }
/>
    </div>

    <div className="config-group">
        <label>Primary Color</label>
        <input
    type="color"
    value={config.primaryColor}
    onChange={(e)=>
        setConfig({
            ...config,
            primaryColor:e.target.value
        })
    }
/>
    </div>

    <div className="config-group">
        <label>Widget Position</label>

        <select
    value={config.buttonPosition}
    onChange={(e)=>
        setConfig({
            ...config,
            buttonPosition:e.target.value
        })
    }
>
    <option value="right">Right</option>
    <option value="left">Left</option>
</select>
    </div>
<div className="config-group">
    <label>Widget Size</label>

    <select
        value={config.widgetSize}
        onChange={(e)=>
            setConfig({
                ...config,
                widgetSize:e.target.value
            })
        }
    >
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
    </select>
</div>
<div className ="config-group">
    <label>Widget Icon URL</label>
    <input
    type ="text"
    value ={config.avatarUrl}
    placeholder= "Enter image URL"
    onChange ={(e) =>
        setConfig({
            ...config,
            avatarUrl : e.target.value})
        }
        />
        </div>
    
    <button
    className="save-btn"
    onClick={handleSave}
>
    Save Configuration
</button>
<div>
   
    <Widget config={config} />
</div>
</div>

    );
}

export default WidgetConfiguration;