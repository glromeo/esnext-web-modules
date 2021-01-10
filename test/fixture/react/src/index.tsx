import React from "react";
import ReactDOM from "react-dom";

import {App} from "./App";
import {Provider} from "react-redux";
import {store} from "./redux";

import "/node_modules/antd/dist/antd.css";
import "./index.css";

ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
            <App/>
        </Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
