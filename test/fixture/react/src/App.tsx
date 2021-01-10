import React, {useEffect, useState} from "react";
import "./App.scss";

export function App() {

    const [message, setMessage] = useState<string>("loading...");

    useEffect(() => {
        import("./dynamic-module").then(({message}) => {
            setMessage(message);
        })
    }, []);

    return (
        <div className="App">{message}</div>
    );
}
