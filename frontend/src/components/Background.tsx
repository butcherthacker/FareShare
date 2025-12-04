import React from 'react';

interface BackgroundProps {
  className?: string;
}

const Background: React.FC<BackgroundProps> = ({ className = '' }) => {
  return (
    <div 
      className={`${className}`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -10,
        minWidth: '1600px',
        minHeight: '1000px',
        width: '100vw',
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <div style={{ height: '65.95%', background: 'linear-gradient(to bottom, #90bff7, #ffffff)', position: 'relative' }}>

        {/* Cloud 1 */}
        <div style={{ position: 'absolute', top: '10%', left: '8%', height: '150px', aspectRatio: '2.0' }}>
          <div style={{
            position: 'absolute', inset: 0,
            mask: 'radial-gradient(50% 50%, #000 98%, #0000) no-repeat 92% 95%/32% 62%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 60% 5%/55% 95%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 5% 90%/40% 72%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 20% 20%/30% 42%, linear-gradient(#000 0 0) bottom/72% 60% no-repeat',
            background: '#ffffff',
            borderRadius: '0 0 32% 35%'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0, transform: 'translateY(0px)',
            mask: 'radial-gradient(40% 50%, #000 98%, #0000) no-repeat 89% bottom/32% 32%, radial-gradient(50% 50%, #000 99%, #0000) no-repeat 60% bottom/55% 58%, radial-gradient(41% 50%, #000 98%, #0000) no-repeat 8% bottom/40% 42%, radial-gradient(50% 50%, #000 98%, #0001) no-repeat 20% bottom/30% 45%, linear-gradient(#000 0 0) bottom/72% 10% no-repeat',
            background: 'rgba(219, 250, 255, 0.6)',
            borderRadius: '0 0 32% 35%'
          }}></div>
        </div>

        {/* Cloud 2 */}
        <div style={{ position: 'absolute', top: '25%', left: '40%', transform: 'translateX(-50%)', height: '180px', aspectRatio: '1.8' }}>
          <div style={{
            position: 'absolute', inset: 0,
            mask: 'radial-gradient(50% 50%, #000 98%, #0000) no-repeat 100% 100%/30% 60%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 70% 0/50% 100%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 0 100%/36% 68%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 27% 18%/26% 40%, linear-gradient(#000 0 0) bottom/67% 58% no-repeat',
            background: '#ffffff'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0, transform: 'translateY(0px)',
            mask: 'radial-gradient(40% 50%, #000 98%, #0000) no-repeat 100% bottom/30% 30%, radial-gradient(50% 50%, #000 99%, #0000) no-repeat 70% bottom/50% 60%, radial-gradient(41% 50%, #000 98%, #0000) no-repeat 0 bottom/36% 38%, radial-gradient(50% 50%, #000 98%, #0001) no-repeat 27% bottom/26% 50%, linear-gradient(#000 0 0) bottom/67% 8% no-repeat',
            background: 'rgba(219, 250, 255, 0.6)'
          }}></div>
        </div>

        {/* Cloud 3 */}
        <div style={{ position: 'absolute', top: '8%', left: '72%', height: '140px', aspectRatio: '1.7' }}>
          <div style={{
            position: 'absolute', inset: 0,
            mask: 'radial-gradient(50% 50%, #000 98%, #0000) no-repeat 95% 92%/33% 64%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 65% 8%/48% 96%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 8% 95%/34% 66%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 30% 22%/24% 38%, linear-gradient(#000 0 0) bottom/65% 56% no-repeat',
            background: '#ffffff',
            borderRadius: '0 0 35% 30%'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0, transform: 'translateY(0px)',
            mask: 'radial-gradient(40% 50%, #000 98%, #0000) no-repeat 95% bottom/33% 34%, radial-gradient(50% 50%, #000 99%, #0000) no-repeat 65% bottom/48% 62%, radial-gradient(41% 50%, #000 98%, #0000) no-repeat 11% bottom/34% 36%, radial-gradient(50% 50%, #000 98%, #0001) no-repeat 30% bottom/24% 42%, linear-gradient(#000 0 0) bottom/65% 9% no-repeat',
            background: 'rgba(219, 250, 255, 0.6)',
            borderRadius: '0 0 35% 30%'
          }}></div>
        </div>

        {/* Cloud 4 */}
        <div style={{ position: 'absolute', top: '20%', left: '88%', height: '120px', aspectRatio: '1.5' }}>
          <div style={{
            position: 'absolute', inset: 0,
            mask: 'radial-gradient(50% 50%, #000 98%, #0000) no-repeat 88% 88%/36% 68%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 55% 12%/52% 92%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 12% 82%/42% 75%, radial-gradient(50% 50%, #000 98%, #0000) no-repeat 25% 28%/32% 48%, linear-gradient(#000 0 0) bottom/68% 54% no-repeat',
            background: '#ffffff',
            borderRadius: '0 0 40% 45%'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0, transform: 'translateY(0px)',
            mask: 'radial-gradient(40% 50%, #000 98%, #0000) no-repeat 85% bottom/36% 38%, radial-gradient(50% 50%, #000 99%, #0000) no-repeat 55% bottom/52% 56%, radial-gradient(41% 50%, #000 98%, #0000) no-repeat 15% bottom/42% 44%, radial-gradient(50% 50%, #000 98%, #0001) no-repeat 25% bottom/32% 52%, linear-gradient(#000 0 0) bottom/68% 11% no-repeat',
            background: 'rgba(219, 250, 255, 0.6)',
            borderRadius: '0 0 40% 45%'
          }}></div>
        </div>

        {/* Hills */}
        <div style={{ position: 'absolute', bottom: '0px', left: '59%', width: '25%', height: '146px', background: '#c7e6ff 20%', border: '3px solid #3e78bb', borderRadius: '80px 0 0 0' }}></div>
        <div style={{ position: 'absolute', bottom: '0px', left: '46.5%', width: '15%', height: '146px', background: '#acd3f2 20%', border: '3px solid #3e78bb', borderRadius: '0 80px 0 0' }}></div>

        {/* SVG Tree/Pole */}
        <div style={{ position: 'absolute', bottom: '-4px', left: '52%', width: '100px', height: '748px' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scale(0.95, 1.1)', transformOrigin: 'bottom' }} viewBox="0 0 400 2954">
            <path d="M195.276 18.898 C 195.276 33.596,194.226 37.795,190.551 37.795 C 186.463 37.795,185.826 49.785,185.818 126.772 C 185.805 257.434,182.718 333.858,177.455 333.858 C 173.998 333.858,173.228 354.396,173.228 446.643 L 173.228 559.429 155.906 574.384 C 134.072 593.234,132.601 603.991,149.606 620.472 L 160.630 631.157 160.630 789.227 C 160.630 944.648,160.524 947.324,154.331 948.944 C 147.491 950.733,144.494 985.827,151.181 985.827 C 152.913 985.827,154.331 993.622,154.331 1003.150 L 154.331 1020.472 120.897 1020.472 L 87.463 1020.472 89.696 1038.583 C 90.924 1048.543,93.213 1057.165,94.783 1057.743 C 100.613 1059.887,96.949 1064.222,67.717 1089.764 L 37.795 1115.907 37.795 1139.877 C 37.795 1162.964,38.304 1164.605,51.610 1184.440 L 65.425 1205.033 57.909 1211.727 C 34.725 1232.377,51.499 1249.754,97.206 1252.435 L 132.996 1254.534 130.945 1300.495 C 129.818 1325.774,127.473 1378.346,125.735 1417.323 C 104.458 1894.477,57.438 2552.247,26.671 2803.150 C 17.292 2879.632,17.517 2878.740,7.662 2878.740 C 0.681 2878.740,0.000 2880.000,0.000 2892.913 C 0.000 2905.031,0.922 2907.087,6.359 2907.087 C 13.113 2907.087,13.105 2907.764,6.011 2935.433 C 4.457 2941.496,3.177 2948.228,3.167 2950.394 C 3.153 2953.501,44.610 2954.331,200.000 2954.331 C 355.390 2954.331,396.847 2953.501,396.833 2950.394 C 396.823 2948.228,395.543 2941.496,393.989 2935.433 C 386.895 2907.764,386.887 2907.087,393.641 2907.087 C 399.078 2907.087,400.000 2905.031,400.000 2892.913 C 400.000 2880.000,399.319 2878.740,392.338 2878.740 C 382.483 2878.740,382.708 2879.632,373.329 2803.150 C 342.562 2552.247,295.542 1894.477,274.265 1417.323 C 272.527 1378.346,270.182 1325.774,269.055 1300.495 L 267.004 1254.534 302.794 1252.435 C 348.501 1249.754,365.275 1232.377,342.091 1211.727 L 334.575 1205.033 348.390 1184.440 C 361.696 1164.605,362.205 1162.964,362.205 1139.877 L 362.205 1115.907 332.283 1089.764 C 303.051 1064.222,299.387 1059.887,305.217 1057.743 C 306.787 1057.165,309.076 1048.543,310.304 1038.583 L 312.537 1020.472 279.103 1020.472 L 245.669 1020.472 245.669 1003.150 C 245.669 993.622,247.087 985.827,248.819 985.827 C 255.506 985.827,252.509 950.733,245.669 948.944 C 239.476 947.324,239.370 944.648,239.370 789.227 L 239.370 631.157 250.394 620.472 C 267.399 603.991,265.928 593.234,244.094 574.384 L 226.772 559.429 226.772 446.643 C 226.772 354.396,226.002 333.858,222.545 333.858 C 217.282 333.858,214.195 257.434,214.182 126.772 C 214.174 49.785,213.537 37.795,209.449 37.795 C 205.774 37.795,204.724 33.596,204.724 18.898 C 204.724 4.199,203.675 0.000,200.000 0.000 C 196.325 0.000,195.276 4.199,195.276 18.898" fill="url(#grad1)" stroke="#3e78bb" strokeWidth="12" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#68d1ff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#3e78bb', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>

          {/* Cylinder */}
          <div style={{
            position: 'absolute', bottom: '1%', left: '42%',
            height: '463px',
            aspectRatio: '0.03',
            background: 'radial-gradient(closest-side at 12.5% 25%, #80223c 97%, transparent 101%) 0 0/80% 2%, linear-gradient(#80223c 50%, transparent 0) top/80% 2% repeat-y'
          }}></div>

          {/* Tile pattern */}
          <div style={{
            position: 'absolute', bottom: '66.8%', left: '12.9%', width: '75%', height: '8px',
            background: 'repeating-conic-gradient(from 45deg at 50% 50%, #69c5ed 0deg 90deg, #3e78bb 90deg 180deg) 0 0 / 8px 8px'
          }}></div>

          {/* Oval */}
          <div style={{
            position: 'absolute', bottom: '63.1%', left: '11.3%', width: '78%', height: '14px', borderRadius: '35%',
            background: 'linear-gradient(#aee1fe 30%, #739fc5)', border: '3px solid #3e78bb'
          }}></div>
        </div>

        {/* Large SVG Building at 61% */}
        <div style={{ position: 'absolute', bottom: '3px', left: '61%', width: '280px', height: '196px' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scale(1.8, 1.8)', transformOrigin: 'bottom' }} viewBox="0 0 400 421">
            <path d="M114.788 24.881 C 113.338 25.351,110.835 26.604,109.224 27.664 L 106.296 29.592 106.003 63.259 L 105.710 96.925 96.047 97.218 C 85.020 97.552,83.302 98.124,80.976 102.229 L 79.668 104.539 79.658 180.212 L 79.649 255.885 77.160 256.511 C 68.112 258.788,62.010 264.879,59.744 273.894 C 59.219 275.985,58.855 276.398,57.237 276.748 C 51.995 277.882,45.811 282.713,43.289 287.646 C 40.363 293.369,40.424 291.861,40.417 358.565 L 40.410 421.083 200.586 421.083 L 360.761 421.083 360.754 358.565 C 360.747 291.861,360.808 293.369,357.882 287.646 C 355.360 282.713,349.177 277.882,343.935 276.748 C 342.316 276.398,341.953 275.985,341.427 273.894 C 339.161 264.879,333.059 258.788,324.012 256.511 L 321.523 255.885 321.513 180.212 L 321.503 104.539 320.195 102.229 C 317.870 98.124,316.151 97.552,305.124 97.218 L 295.461 96.925 295.168 63.259 L 294.876 29.592 291.947 27.663 C 283.287 21.961,277.213 22.985,267.770 31.741 C 259.310 39.586,255.072 42.107,248.755 43.054 L 245.974 43.471 245.974 53.019 L 245.974 62.568 243.053 63.194 C 238.197 64.236,233.243 66.541,227.158 70.592 L 221.376 74.441 221.308 159.183 C 221.208 283.227,220.644 337.795,219.411 342.503 C 212.914 367.320,188.751 367.829,182.001 343.291 C 180.473 337.733,179.968 294.306,179.862 159.183 L 179.795 74.441 174.013 70.592 C 167.928 66.541,162.975 64.236,158.118 63.194 L 155.198 62.568 155.198 53.019 L 155.198 43.471 152.417 43.054 C 146.099 42.107,141.862 39.586,133.401 31.741 C 125.788 24.682,120.922 22.888,114.788 24.881" fill="url(#grad2)" stroke="#3e78bb" strokeWidth="4" />
            <defs>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#68d1ff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#3e78bb', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', bottom: '-1%', left: '35%', width: '5%', height: '240px', background: 'linear-gradient(#68d1ff 50%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '-1%', left: '25%', width: '5%', height: '180px', background: 'linear-gradient(#68d1ff 50%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '-1%', left: '15%', width: '5%', height: '140px', background: 'linear-gradient(#68d1ff 50%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '-1%', right: '35%', width: '5%', height: '240px', background: 'linear-gradient(#68d1ff 50%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '-1%', right: '25%', width: '5%', height: '180px', background: 'linear-gradient(#68d1ff 50%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '-1%', right: '15%', width: '5%', height: '140px', background: 'linear-gradient(#68d1ff 0%, #3e78bb)', border: '3px solid #478cca', borderRadius: '9px 9px 0 0' }}></div>
        </div>

        {/* Small buildings at 95% and 80% */}
        <div style={{ position: 'absolute', bottom: '0px', left: '95%', width: '8%', height: '110px', background: '#acd3f2', border: '3px solid #3e78bb', borderRadius: '50px 50px 0 0' }}></div>

        <div style={{ position: 'absolute', bottom: '0px', left: '80%', width: '6%', height: '146px', background: '#a5cff1 20%', border: '3px solid #3e78bb' }}></div>
        <div style={{ position: 'absolute', bottom: '0px', left: '80%', width: '6%', height: '129px', background: 'linear-gradient(to bottom left, #68d1ff 5%, #3e78bb 30%)', border: '4px solid #3e78bb', borderRadius: '9px 80px 0 0' }}></div>
        <div style={{ position: 'absolute', bottom: '0px', left: '80%', width: '6%', height: '104px', background: '#a5cff1 20%', border: '4px solid #3e78bb', borderRadius: '9px 80px 0 0' }}></div>

        {/* Small decorative elements */}
        <div style={{ position: 'absolute', bottom: '11%', left: '39.5%', width: '1%', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '3px 10px' }}></div>
        <div style={{ position: 'absolute', bottom: '11%', left: '40.3%', width: '1%', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '3px 10px' }}></div>
        <div style={{ position: 'absolute', bottom: '11%', left: '41%', width: '1%', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '3px 10px' }}></div>
        
        <div style={{ position: 'absolute', bottom: '0', left: '30%', width: '13%', height: '100px', background: 'linear-gradient(#79b7e9 20%, #3e78bb 20% 40%, #79b7e9 40%)', border: '3px solid #3e78bb' }}></div>

        {/* Building #5 */}
        <div style={{ position: 'absolute', bottom: '0', left: '33%', transform: 'translateX(140%)', width: '120px', height: '300px' }}>
          <div style={{ position: 'absolute', bottom: '53%', left: '15%', width: '70%', height: '50px', background: '#7cc5fa', border: '3px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', bottom: '70%', left: '20%', width: '55%', height: '30px', background: '#7cc5fa', border: '3px solid #3e78bb', borderRadius: '10px 10px 10px 10px' }}></div>
          <div style={{ position: 'absolute', bottom: '70%', left: '45%', width: '30%', height: '30px', background: '#70b7ea', border: '3px solid #3e78bb', borderRadius: '10px 10px 10px 10px' }}></div>
          <div style={{ position: 'absolute', bottom: '63%', left: '5%', width: '90%', height: '30px', background: '#7cc5fa', border: '3px solid #3e78bb', borderRadius: '10px 10px 10px 10px' }}></div>
          <div style={{ position: 'absolute', bottom: '63%', left: '45%', width: '50%', height: '30px', background: '#70b7ea', border: '3px solid #3e78bb', borderRadius: '10px 10px 10px 10px' }}></div>
          <div style={{ position: 'absolute', bottom: '0', width: '100%', height: '180px', background: '#7cc5fa', border: '3px solid #3e78bb', borderRadius: '10px 10px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', right: '0', width: '48%', height: '180px', background: '#70b7ea', border: '3px solid #3e78bb', borderRadius: '10px 10px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '50%', width: '50%', height: '10px', background: '#70b7ea', border: '3px solid #3e78bb', borderRadius: '10px 10px 0 0' }}></div>
          
          {/* Windows in Building #5 */}
          <div style={{ position: 'absolute', bottom: '35%', left: '58%', width: '18px', height: '20px', background: '#77a8d0', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '35%', left: '78%', width: '18px', height: '20px', background: '#77a8d0', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '45%', left: '58%', width: '18px', height: '20px', background: '#77a8d0', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '45%', left: '78%', width: '18px', height: '20px', background: '#77a8d0', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '35%', left: '28%', width: '22px', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '35%', left: '7%', width: '22px', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '45%', left: '28%', width: '22px', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '45%', left: '7%', width: '22px', height: '20px', background: '#79b7e9', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
        </div>

        {/* Building #2 */}
        <div style={{ position: 'absolute', bottom: '0', left: '3%', transform: 'translateX(140%)', width: '150px', height: '300px' }}>
          <div style={{ position: 'absolute', bottom: '0', right: '60%', width: '100%', height: '130px', background: '#acd3f2', border: '3px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '60%', width: '100%', height: '110px', background: '#acd3f2', border: '3px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', bottom: '53%', width: '100%', aspectRatio: '3/2', clipPath: 'ellipse(85% 100% at 50% 100%)', background: '#3e78bb' }}></div>
          <div style={{ position: 'absolute', bottom: '53%', left: '4px', width: '142px', aspectRatio: '3/2', clipPath: 'ellipse(85% 100% at 50% 100%)', background: 'linear-gradient(#70b7ea 80%, #3e78bb)' }}></div>
          <div style={{ position: 'absolute', bottom: '53%', left: '20%', width: '60%', aspectRatio: '3/2', clipPath: 'ellipse(85% 100% at 50% 100%)', background: '#3e78bb', borderRadius: '28px 28px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', width: '100%', height: '200px', background: 'linear-gradient(#70b7ea 80%, #3e78bb)', border: '4px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '20%', width: '60%', height: '170px', background: '#3e78bb', borderRadius: '10px 10px 0 0' }}></div>
        </div>

        {/* Building 3 */}
        <div style={{ position: 'absolute', bottom: '+4px', left: '4%', transform: 'translateX(140%)', width: '250px', height: '250px' }}>
          <div style={{ position: 'absolute', bottom: '-4px', width: '100%', height: '150px', background: 'linear-gradient(#70b7ea 80%, #3e78bb)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', top: '32%', left: '40%', width: '2%', height: '170px', background: '#3e78bb' }}></div>
          <div style={{ position: 'absolute', top: '32%', left: '70%', width: '2%', height: '170px', background: '#3e78bb' }}></div>
          <div style={{ position: 'absolute', top: '53%', left: '5', width: '100%', height: '30px', background: '#3f8ee9', border: '4px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', top: '73%', left: '5', width: '100%', height: '30px', background: '#3f8ee9', border: '4px solid #3e78bb' }}></div>
          <div style={{ position: 'absolute', top: '32%', width: '15%', height: '170px', background: '#3f8ee9', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', top: '32%', width: '110%', height: '30px', background: 'linear-gradient(to bottom left, #54a3ff, #3f8ee9 50%)', border: '4px solid #3e78bb', borderRadius: '9px' }}></div>
        </div>

        {/* Building 9 */}
        <div style={{ position: 'absolute', bottom: '0', left: '84%', width: '250px', height: '250px' }}>
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: '30%', height: '150px', background: 'linear-gradient(#70b7ea, #3e78bb 99%)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', width: '100%', height: '170px', background: 'linear-gradient(#70b7ea 31%, #3e78bb 31% 48%, #70b7ea 48% 75%, #3e78bb 70%)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '2%', left: '70%', width: '15%', height: '177px', background: 'linear-gradient(#aa6fa1, #80223c 80%)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '80%', width: '20%', height: '170px', background: 'linear-gradient(#70b7ea 30%, #3e78bb 30% 50%, #70b7ea 50% 75%, #3e78bb 70%)', border: '4px solid #3e78bb', borderRadius: '0 9px 0 0' }}></div>
        </div>

        {/* Building 8 */}
        <div style={{ position: 'absolute', bottom: '0', left: '76%', width: '100px', height: '280px' }}>
          <div style={{ position: 'absolute', top: '16%', width: '100%', height: '150px', background: 'linear-gradient(#6bbdfa, #3e78bb 99%)', border: '4px solid #3e78bb', borderRadius: '50px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', top: '1%', left: '50%', width: '50%', height: '150px', background: 'linear-gradient(#6bbdfa 30%, #3e78bb 80%)', border: '4px solid #3e78bb', borderRadius: '8px 50px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', width: '100%', height: '200px', background: 'linear-gradient(#6bbdfa 35%, #3e78bb 30% 50%, #6bbdfa 50% 75%, #3e78bb 70%)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '70%', width: '15%', height: '235px', background: 'linear-gradient(#68d1ff 80%, #3e78bb)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '45%', width: '15%', height: '180px', background: 'linear-gradient(#68d1ff 80%, #3e78bb)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', right: '70%', width: '15%', height: '140px', background: 'linear-gradient(#68d1ff 80%, #3e78bb)', border: '4px solid #3e78bb', borderRadius: '9px 9px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '81%', width: '20%', height: '200px', background: 'linear-gradient(#6bbdfa 35%, #3e78bb 30% 50%, #6bbdfa 50% 75%, #3e78bb 70%)', border: '4px solid #3e78bb', borderRadius: '0 9px 0 0' }}></div>
        </div>

        {/* Map Marker Monument */}
        <div style={{ position: 'absolute', bottom: '3px', left: '58%', width: '70px', height: '80px' }}>
          <div style={{
            position: 'absolute', bottom: '3%', height: '70px', aspectRatio: '2/3',
            mask: 'conic-gradient(from -30deg at bottom, transparent, #000 1deg 59deg, transparent 60deg) bottom/100% 50% no-repeat, radial-gradient(circle at 50% calc(100% / 3), transparent 21.5%, #000 22% 44%, transparent 44.5%)',
            background: 'linear-gradient(#aa6fa1, #80223c 60%)'
          }}></div>
          <div style={{ position: 'absolute', bottom: '0', left: '2%', width: '60%', height: '10px', background: '#404a56', borderRadius: '9px 9px 0 0' }}></div>
        </div>

        {/* Semi-circular building with arch */}
        <div style={{ position: 'absolute', bottom: '0', left: '40%', width: '200px', height: '100px' }}>
          {/* Semi-circle on top */}
          <div style={{ position: 'absolute', top: '0', width: '200px', height: '100px', borderRadius: '100px 100px 0 0', background: 'linear-gradient(#c7efff, #6bbdfa 70%)', border: '4px solid #3e78bb' }}></div>
          
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: '160px', height: '80px', borderRadius: '80px 80px 0 0', background: 'radial-gradient(#3f94d4 30%, #c7efff)', border: '8px double #3e78bb' }}></div>

          {/* Rectangle on bottom */}
          <div style={{ position: 'absolute', bottom: '0', width: '100%', height: '50px', background: 'radial-gradient(#acd3f2, #86b0e1 70%)', border: '4px solid #3e78bb' }}></div>

          {/* Decorative border */}
          <div style={{
            position: 'absolute', bottom: '37%',
            height: '8px',
            width: '100%',
            background: '0/8px space no-repeat',
            backgroundImage: 'radial-gradient(circle closest-side at left top 50%, #3e78bb calc(100% - 1px), transparent), radial-gradient(circle closest-side at right top 50%, #3e78bb calc(100% - 1px), transparent), linear-gradient(90deg, transparent 25%, #3e78bb 0 75%, transparent 0)'
          }}></div>

          {/* Windows */}
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '32px', height: '20px', background: 'linear-gradient(180deg, #aee1fe 0% 40%, #79b7e9 66.66% 100%)', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '32px', height: '20px', background: 'linear-gradient(180deg, #aee1fe 0% 40%, #79b7e9 66.66% 100%)', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
          <div style={{ position: 'absolute', bottom: '10%', left: '39%', width: '42px', height: '20px', background: 'linear-gradient(180deg, #aee1fe 0% 40%, #79b7e9 66.66% 100%)', border: '3px solid #3e78bb', borderRadius: '5px 5px 5px 5px' }}></div>
        </div>

        {/* Circle building with basketball */}
        <div style={{ position: 'absolute', bottom: '0', left: '2%', width: '200px', height: '100px' }}>
          {/* Circle/Basketball on top */}
          <div style={{
            position: 'absolute', bottom: '0', transform: 'translateY(-20%)', width: '200px', height: '200px',
            borderRadius: '50%',
            background: 'repeating-linear-gradient(60deg, transparent, transparent 8px, #3e78bb 5px, #0a5897 10px, transparent 10px, transparent 15px), repeating-linear-gradient(120deg, transparent, transparent 8px, #3e78bb 5px, #0a5897 10px, transparent 10px, transparent 15px), repeating-linear-gradient(0deg, transparent, transparent 8px, #3e78bb 5px, #0a5897 10px, transparent 10px, transparent 15px), linear-gradient(#acd3f2 20%, #80223c)',
            outline: '4px solid #0a5897',
            outlineOffset: '4px'
          }}>
            {/* Ball seam lines */}
            <svg style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} viewBox="0 0 200 200">
              {/* Vertical center line */}
              <line x1="100" y1="0" x2="100" y2="200" stroke="#0a5897" strokeWidth="2" />
              {/* Left curved lines */}
              <path d="M 70 05 Q 55 100 70 195" fill="none" stroke="#0a5897" strokeWidth="2.0" />
              <path d="M 50 15 Q 35 100 50 185" fill="none" stroke="#0a5897" strokeWidth="2.0" />
              <path d="M 25 35 Q 15 100 25 165" fill="none" stroke="#0a5897" strokeWidth="2.0" />
              {/* Right curved lines */}
              <path d="M 130 05 Q 145 100 130 195" fill="none" stroke="#0a5897" strokeWidth="2.0" />
              <path d="M 150 15 Q 165 100 150 185" fill="none" stroke="#0a5897" strokeWidth="2.0" />
              <path d="M 175 35 Q 185 100 175 165" fill="none" stroke="#0a5897" strokeWidth="2.0" />
            </svg>
          </div>

          {/* Dashed ring around basketball */}
          <div style={{
            position: 'absolute', bottom: '0', transform: 'translate(-2.5%, -17%)',
            height: '210px',
            aspectRatio: '1',
            borderRadius: '50%',
            padding: '10px',
            background: 'radial-gradient(#ffe8c1, #eb9709)',
            mask: 'linear-gradient(transparent 0 0) content-box intersect, repeating-conic-gradient(from calc(13deg/2), #000 0 calc(360deg/20 - 13deg), transparent 0 calc(360deg/20))'
          }}></div>

          {/* Rectangle on bottom */}
          <div style={{
            position: 'absolute', bottom: '0', left: '-5%', width: '110%', height: '50px',
            background: 'repeating-linear-gradient(0deg, #0a5897 0px 1px, transparent 1px 11px), repeating-linear-gradient(90deg, #0a5897 0px 1px, transparent 2px 10px), linear-gradient(180deg, #8ed0fc 0% 40%, #79b7e9 40% 66.66%, #64a6db 66.66% 100%)',
            border: '4px solid #0a5897'
          }}></div>

          {/* Triangle above rectangle */}
          <div style={{
            position: 'absolute', bottom: '50px', left: '30.5%', width: '38%', height: '24px',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: '#0a5897'
          }}></div>
          <div style={{
            position: 'absolute', bottom: '50px', left: '33%', width: '33%', height: '20px',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'linear-gradient(#aee1fe, #8ed0fc)'
          }}></div>

          {/* Vertical rectangles with dots */}
          <div style={{
            position: 'absolute', bottom: '0', left: '2%', width: '18%', height: '50px',
            background: 'repeating-linear-gradient(0deg, #0a5897 0px 1px, transparent 1px 10px), repeating-linear-gradient(90deg, #0a5897 0px 1px, transparent 1px 10px), linear-gradient(180deg, #aee1fe 0% 40%, #8ed0fc 40% 66.66%, #79b7e9 66.66% 100%)',
            backgroundSize: '9px 10px, 100% 100%, 100% 100%, 100% 100%',
            border: '3px solid #0a5897'
          }}></div>

          <div style={{
            position: 'absolute', bottom: '0', left: '27%', width: '18%', height: '50px',
            background: 'repeating-linear-gradient(0deg, #0a5897 0px 1px, transparent 1px 11px), repeating-linear-gradient(90deg, #0a5897 0px 1px, transparent 1px 10px), linear-gradient(180deg, #aee1fe 0% 40%, #8ed0fc 40% 66.66%, #79b7e9 66.66% 100%)',
            backgroundSize: '9px 10px, 100% 100%, 100% 100%, 100% 100%',
            border: '3px solid #0a5897'
          }}></div>

          <div style={{
            position: 'absolute', bottom: '0', right: '26%', width: '18%', height: '50px',
            background: 'repeating-linear-gradient(0deg, #0a5897 0px 1px, transparent 1px 11px), repeating-linear-gradient(90deg, #0a5897 0px 1px, transparent 1px 10px), linear-gradient(180deg, #aee1fe 0% 40%, #8ed0fc 40% 66.66%, #79b7e9 66.66% 100%)',
            backgroundSize: '9px 10px, 100% 100%, 100% 100%, 100% 100%',
            border: '3px solid #0a5897'
          }}></div>

          <div style={{
            position: 'absolute', bottom: '0', right: '1%', width: '18%', height: '50px',
            background: 'repeating-linear-gradient(0deg, #0a5897 0px 1px, transparent 1px 11px), repeating-linear-gradient(90deg, #0a5897 0px 1px, transparent 1px 10px), linear-gradient(180deg, #aee1fe 0% 40%, #8ed0fc 40% 66.66%, #79b7e9 66.66% 100%)',
            backgroundSize: '9px 10px, 100% 100%, 100% 100%, 100% 100%',
            border: '3px solid #0a5897'
          }}></div>
        </div>

      </div>

      {/* Bottom sections - stripes and roads */}
      <div style={{ height: '2.5%', backgroundColor: '#fc4a1a' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#916b47' }}></div>
      <div style={{ height: '1%', backgroundColor: '#c37e45' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#916b47' }}></div>
      
      <div style={{ height: '3%', backgroundColor: '#3bbdca', position: 'relative' }}>
        {/* Water waves */}
        <div style={{ position: 'absolute', bottom: '28.5%', left: '57%', width: '10px', height: '7px', background: '#e7f0f1', borderRadius: '50% 50% 42% 20%' }}></div>
        <div style={{ position: 'absolute', bottom: '28%', left: '58%', width: '20px', height: '10px', background: '#e7f0f1', borderRadius: '42% 50% 70% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '28%', left: '28%', width: '20px', height: '10px', background: '#e7f0f1', borderRadius: '80% 50% 62% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '28%', left: '18%', width: '20px', height: '10px', background: '#e7f0f1', borderRadius: '30% 50% 42% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '27.3%', left: '20%', width: '16px', height: '8px', background: '#e7f0f1', borderRadius: '42% 70% 42% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '28%', left: '78%', width: '20px', height: '10px', background: '#e7f0f1', borderRadius: '30% 50% 42% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '29%', left: '48%', width: '14px', height: '6px', background: '#e7f0f1', borderRadius: '30% 50% 42% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '28%', left: '92%', width: '20px', height: '10px', background: '#e7f0f1', borderRadius: '30% 50% 42% 50%' }}></div>
        <div style={{ position: 'absolute', bottom: '27.4%', left: '93%', width: '16px', height: '7px', background: '#e7f0f1', borderRadius: '80% 50% 42% 50%' }}></div>
      </div>

      <div style={{ height: '0.4%', backgroundColor: '#c37e45' }}></div>
      <div style={{ height: '1%', backgroundColor: '#fef3e2' }}></div>
      <div style={{ height: '1.2%', backgroundColor: '#776864' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#5b4843' }}></div>

      <div style={{ height: '8%', backgroundColor: '#fc4a1a', position: 'relative' }}>
        {/* Lane markers - using array map for efficiency */}
        {[1, 3.5, 5.9, 8.3, 10.8, 18, 20.5, 22.9, 25.3, 27.8, 35, 37.5, 39.9, 42.3, 44.8, 52, 54.5, 56.9, 59.3, 61.8, 69, 71.5, 73.9, 76.3, 78.8, 86, 88.5, 90.9, 93.3, 95.8].map((left, idx) => (
          <div key={`lane${idx}`} style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '1.5%', background: '#5cd9e4', border: '4px solid #5b4843', borderRadius: '9px', margin: '0.5%' }}></div>
        ))}
        
        {/* Road dividers */}
        {[14, 31, 48, 65, 82].map((left, idx) => (
          <React.Fragment key={`div${idx}`}>
            <div style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '3%', background: 'linear-gradient(to bottom, #524343 10%, #776864 5%)' }}></div>
            <div style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '0.3%', backgroundColor: '#5b4843' }}></div>
            <div style={{ position: 'absolute', left: `${left + 3}%`, top: 0, bottom: 0, width: '0.3%', backgroundColor: '#5b4843' }}></div>
          </React.Fragment>
        ))}

        {/* Wave decorations on road */}
        <div style={{ position: 'absolute', bottom: '32%', left: '23.7%', width: '14px', height: '6px', background: '#e7f0f1', borderRadius: '90% 41% 90% 90%' }}></div>
        <div style={{ position: 'absolute', bottom: '48%', left: '57.7%', width: '13px', height: '6px', background: '#e7f0f1', borderRadius: '50% 41% 50% 30%' }}></div>
        <div style={{ position: 'absolute', bottom: '29%', left: '86.8%', width: '13px', height: '6px', background: '#e7f0f1', borderRadius: '30% 50% 42% 50%' }}></div>
      </div>

      <div style={{ height: '0.3%', backgroundColor: '#5b4843' }}></div>
      <div style={{ height: '1%', backgroundColor: '#776864' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#6f5353' }}></div>
      <div style={{ height: '3%', backgroundColor: '#e4d8c4' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#6f5353' }}></div>
      <div style={{ height: '0.45%', backgroundColor: '#997f72' }}></div>
      <div style={{ height: '0.4%', backgroundColor: '#ae8e7f' }}></div>
      <div style={{ height: '0.3%', backgroundColor: '#715348' }}></div>
      <div style={{ height: '10%', backgroundColor: '#5f5c5b' }}></div>
    </div>
  );
};

export default Background;
