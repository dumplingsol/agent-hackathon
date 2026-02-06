'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function GradientBackground() {
  const handleScriptLoad = () => {
    console.log('[Gradient] Script loaded');
    
    // Initialize gradient after script loads
    if (typeof window !== 'undefined' && (window as any).Gradient) {
      console.log('[Gradient] Initializing...');
      try {
        const gradient = new (window as any).Gradient();
        gradient.initGradient("#gradient-canvas");
        
        // Apply custom settings BEFORE init
        setTimeout(() => {
          if (gradient.mesh) {
            gradient.amp = 60;
            gradient.noiseSpeed = 9e-6;
            if (gradient.uniforms?.u_global?.value?.noiseSpeed) {
              gradient.uniforms.u_global.value.noiseSpeed.value = 9e-6;
            }
            if (gradient.uniforms?.u_vertDeform?.value?.noiseAmp) {
              gradient.uniforms.u_vertDeform.value.noiseAmp.value = 60;
            }
            console.log('[Gradient] Settings applied');
          }
        }, 100);
        
        (window as any).gradientInstance = gradient;
        console.log('[Gradient] Initialized successfully');
      } catch (error) {
        console.error('[Gradient] Init error:', error);
      }
    } else {
      console.error('[Gradient] Gradient class not found');
    }
  };

  return (
    <>
      <canvas 
        id="gradient-canvas" 
        data-transition-in
        data-js-darken-top=""
      />
      <Script 
        src="/gradient.js" 
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
    </>
  );
}
