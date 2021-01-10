import {combineReducers, configureStore, createAction, createReducer} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import logger from "redux-logger";
import thunk from "redux-thunk";

export const sampleAction = createAction<string>("SAMPLE_ACTION");

export const sampleReducer = createReducer(new Map<string, number>(), builder => builder
    .addCase(sampleAction, (messages, {payload: message}) => {
        messages.set(message, messages.has(message) ? messages.get(message)! + 1 : 1);
    })
);

enableMapSet();

export const fixAtdl = combineReducers({
    sampleReducer
});

export const store = configureStore({
    reducer: fixAtdl,
    middleware: [thunk, logger]
});

