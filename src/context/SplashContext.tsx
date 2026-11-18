import React, { createContext, useContext } from 'react';

const SplashContext = createContext<boolean>(true);

export const SplashProvider = SplashContext.Provider;

/** True once the launch splash overlay has finished its transition. */
export const useSplashComplete = (): boolean => useContext(SplashContext);
