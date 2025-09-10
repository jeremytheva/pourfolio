import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import { beverageTypes } from '../utils/beverageTypes';

function RadarChart({ 
  data, 
  beverageType = 'beer', 
  chartType = 'rating', 
  width = '100%', 
  height = '400px',
  showValue = true,
  compareData = null,
  className = ''
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const currentBeverage = beverageTypes[beverageType];

  // Define radar configurations for different beverage types and chart types
  const getRadarConfig = () => {
    const configs = {
      beer: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Aroma', max: 7, color: '#06B6D4' },
            { name: 'Mouthfeel', max: 7, color: '#10B981' },
            { name: 'Flavour', max: 7, color: '#F59E0B' },
            { name: 'Follow', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Hop Intensity', max: 10, color: '#22C55E' },
            { name: 'Maltiness', max: 10, color: '#A855F7' },
            { name: 'Bitterness', max: 10, color: '#EF4444' },
            { name: 'Sweetness', max: 10, color: '#F97316' },
            { name: 'Fruitiness', max: 10, color: '#EC4899' },
            { name: 'Alcohol Warmth', max: 10, color: '#8B5CF6' },
            { name: 'Body/Thickness', max: 10, color: '#06B6D4' },
            { name: 'Carbonation', max: 10, color: '#10B981' }
          ]
        }
      },
      wine: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Aroma', max: 7, color: '#06B6D4' },
            { name: 'Taste', max: 7, color: '#10B981' },
            { name: 'Balance', max: 7, color: '#F59E0B' },
            { name: 'Finish', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Tannins', max: 10, color: '#7C2D12' },
            { name: 'Acidity', max: 10, color: '#EAB308' },
            { name: 'Sweetness', max: 10, color: '#F97316' },
            { name: 'Fruitiness', max: 10, color: '#DC2626' },
            { name: 'Oak/Vanilla', max: 10, color: '#A3A3A3' },
            { name: 'Mineral Notes', max: 10, color: '#64748B' },
            { name: 'Alcohol Heat', max: 10, color: '#8B5CF6' },
            { name: 'Body/Weight', max: 10, color: '#06B6D4' }
          ]
        }
      },
      spirits: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Nose', max: 7, color: '#06B6D4' },
            { name: 'Palate', max: 7, color: '#10B981' },
            { name: 'Complexity', max: 7, color: '#F59E0B' },
            { name: 'Finish', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Alcohol Heat', max: 10, color: '#DC2626' },
            { name: 'Sweetness', max: 10, color: '#F97316' },
            { name: 'Spice/Pepper', max: 10, color: '#7C2D12' },
            { name: 'Oak/Vanilla', max: 10, color: '#A3A3A3' },
            { name: 'Smoke/Peat', max: 10, color: '#374151' },
            { name: 'Fruit Notes', max: 10, color: '#EC4899' },
            { name: 'Grain Character', max: 10, color: '#EAB308' },
            { name: 'Smoothness', max: 10, color: '#06B6D4' }
          ]
        }
      },
      cider: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Aroma', max: 7, color: '#06B6D4' },
            { name: 'Sweetness', max: 7, color: '#10B981' },
            { name: 'Acidity', max: 7, color: '#F59E0B' },
            { name: 'Finish', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Apple Character', max: 10, color: '#22C55E' },
            { name: 'Sweetness', max: 10, color: '#F97316' },
            { name: 'Acidity/Tartness', max: 10, color: '#EAB308' },
            { name: 'Fruit Additions', max: 10, color: '#EC4899' },
            { name: 'Funk/Farmhouse', max: 10, color: '#A3A3A3' },
            { name: 'Carbonation', max: 10, color: '#06B6D4' },
            { name: 'Alcohol Warmth', max: 10, color: '#8B5CF6' },
            { name: 'Body/Texture', max: 10, color: '#10B981' }
          ]
        }
      },
      mead: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Aroma', max: 7, color: '#06B6D4' },
            { name: 'Honey Character', max: 7, color: '#10B981' },
            { name: 'Balance', max: 7, color: '#F59E0B' },
            { name: 'Finish', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Honey Sweetness', max: 10, color: '#F59E0B' },
            { name: 'Floral Notes', max: 10, color: '#EC4899' },
            { name: 'Fruit Character', max: 10, color: '#DC2626' },
            { name: 'Spice/Herbs', max: 10, color: '#059669' },
            { name: 'Alcohol Warmth', max: 10, color: '#8B5CF6' },
            { name: 'Acidity', max: 10, color: '#EAB308' },
            { name: 'Carbonation', max: 10, color: '#06B6D4' },
            { name: 'Body/Viscosity', max: 10, color: '#10B981' }
          ]
        }
      },
      fermented: {
        rating: {
          indicators: [
            { name: 'Appearance', max: 7, color: '#8B5CF6' },
            { name: 'Aroma', max: 7, color: '#06B6D4' },
            { name: 'Fermentation', max: 7, color: '#10B981' },
            { name: 'Balance', max: 7, color: '#F59E0B' },
            { name: 'Finish', max: 7, color: '#EF4444' },
            { name: 'Design', max: 7, color: '#EC4899' },
            { name: 'Value', max: 100, color: '#6366F1' }
          ]
        },
        characteristics: {
          indicators: [
            { name: 'Tartness/Acidity', max: 10, color: '#EAB308' },
            { name: 'Funk/Wild Character', max: 10, color: '#059669' },
            { name: 'Sweetness', max: 10, color: '#F97316' },
            { name: 'Spice/Ginger', max: 10, color: '#DC2626' },
            { name: 'Fruit Character', max: 10, color: '#EC4899' },
            { name: 'Probiotics Feel', max: 10, color: '#22C55E' },
            { name: 'Carbonation', max: 10, color: '#06B6D4' },
            { name: 'Tea/Base Notes', max: 10, color: '#8B5CF6' }
          ]
        }
      }
    };

    return configs[beverageType]?.[chartType] || configs.beer.rating;
  };

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);
    
    const config = getRadarConfig();
    
    // Prepare datasets
    const datasets = [];
    
    // Main data
    if (data.values && data.values.length > 0) {
      datasets.push({
        name: data.name || `${currentBeverage.name} Rating`,
        value: data.values,
        itemStyle: {
          color: data.color || '#F59E0B'
        },
        areaStyle: {
          color: data.color ? `${data.color}20` : '#F59E0B20'
        }
      });
    }

    // Compare data
    if (compareData && compareData.values && compareData.values.length > 0) {
      datasets.push({
        name: compareData.name || 'Comparison',
        value: compareData.values,
        itemStyle: {
          color: compareData.color || '#3B82F6'
        },
        areaStyle: {
          color: compareData.color ? `${compareData.color}20` : '#3B82F620'
        }
      });
    }

    const option = {
      title: {
        text: data.title || `${currentBeverage.name} ${chartType === 'rating' ? 'Rating' : 'Characteristics'} Profile`,
        left: 'center',
        top: 20,
        textStyle: {
          color: '#374151',
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      legend: {
        data: datasets.map(d => d.name),
        bottom: 10,
        textStyle: {
          color: '#6B7280'
        }
      },
      radar: {
        indicator: config.indicators.map(ind => ({
          name: ind.name,
          max: ind.max,
          color: ind.color
        })),
        shape: 'polygon',
        splitNumber: 4,
        radius: '70%',
        center: ['50%', '55%'],
        name: {
          textStyle: {
            color: '#374151',
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        splitArea: {
          areaStyle: {
            color: ['#FAFAFA', '#F3F4F6', '#E5E7EB', '#D1D5DB'],
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowBlur: 5
          }
        },
        splitLine: {
          lineStyle: {
            color: '#9CA3AF',
            width: 1
          }
        },
        axisLine: {
          lineStyle: {
            color: '#6B7280',
            width: 2
          }
        }
      },
      series: [{
        name: `${currentBeverage.name} Analysis`,
        type: 'radar',
        data: datasets,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }],
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          const indicators = config.indicators;
          let tooltip = `<div style="padding: 8px;"><strong>${params.name}</strong><br/>`;
          
          params.value.forEach((value, index) => {
            const indicator = indicators[index];
            const percentage = ((value / indicator.max) * 100).toFixed(1);
            tooltip += `<div style="margin: 4px 0; display: flex; align-items: center;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${indicator.color}; margin-right: 8px; border-radius: 2px;"></span>
              <span style="flex: 1;">${indicator.name}:</span>
              <span style="font-weight: bold; margin-left: 8px;">${value}/${indicator.max} (${percentage}%)</span>
            </div>`;
          });
          
          tooltip += '</div>';
          return tooltip;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: {
          color: '#374151',
          fontSize: 12
        }
      },
      grid: {
        containLabel: true
      }
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, compareData, beverageType, chartType, currentBeverage]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <div 
        ref={chartRef} 
        style={{ width, height }}
        className="min-h-[400px]"
      />
      
      {showValue && data.overallScore && (
        <div className="mt-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {data.overallScore}/5
          </div>
          <div className="text-sm text-gray-600">Overall Rating</div>
        </div>
      )}
    </motion.div>
  );
}

export default RadarChart;