import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';

function AnalyticsChart({ data, type = 'line', title, width = '100%', height = '400px', className = '' }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    initChart();

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, type, title]);

  const initChart = () => {
    if (!chartRef.current || !data) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    chartInstance.current = echarts.init(chartRef.current);

    let option = {};
    switch (type) {
      case 'line':
        option = {
          title: { text: title, left: 'center', textStyle: { color: '#374151', fontSize: 16, fontWeight: 'bold' } },
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E5E7EB', borderWidth: 1, textStyle: { color: '#374151' } },
          legend: { bottom: 10, textStyle: { color: '#6B7280' } },
          xAxis: { type: 'category', data: data.categories || [], axisLine: { lineStyle: { color: '#9CA3AF' } }, axisLabel: { color: '#6B7280' } },
          yAxis: { type: 'value', axisLine: { lineStyle: { color: '#9CA3AF' } }, axisLabel: { color: '#6B7280' }, splitLine: { lineStyle: { color: '#F3F4F6' } } },
          series: data.series || []
        };
        break;
      case 'bar':
        option = {
          title: { text: title, left: 'center', textStyle: { color: '#374151', fontSize: 16, fontWeight: 'bold' } },
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E5E7EB', borderWidth: 1 },
          xAxis: { type: 'category', data: data.categories || [], axisLabel: { color: '#6B7280', rotate: data.categories?.length > 10 ? 45 : 0 } },
          yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
          series: [{ type: 'bar', data: data.values || [], itemStyle: { color: '#F59E0B' }, emphasis: { itemStyle: { color: '#B45309' } } }]
        };
        break;
      case 'pie':
        option = {
          title: { text: title, left: 'center', textStyle: { color: '#374151', fontSize: 16, fontWeight: 'bold' } },
          tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
          legend: { bottom: 10, textStyle: { color: '#6B7280' } },
          series: [{ name: title, type: 'pie', radius: '65%', center: ['50%', '55%'], data: data.values || [], emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }, label: { color: '#374151' } }]
        };
        break;
      case 'heatmap':
        option = {
          title: { text: title, left: 'center', textStyle: { color: '#374151', fontSize: 16, fontWeight: 'bold' } },
          tooltip: { position: 'top' },
          grid: { height: '50%', top: '10%' },
          xAxis: { type: 'category', data: data.xAxis || [], splitArea: { show: true } },
          yAxis: { type: 'category', data: data.yAxis || [], splitArea: { show: true } },
          visualMap: { min: data.min || 0, max: data.max || 5, calculable: true, orient: 'horizontal', left: 'center', bottom: '15%', inRange: { color: ['#FEF3C7', '#F59E0B', '#B45309'] } },
          series: [{ name: title, type: 'heatmap', data: data.values || [], label: { show: true }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }]
        };
        break;
      case 'scatter':
        option = {
          title: { text: title, left: 'center', textStyle: { color: '#374151', fontSize: 16, fontWeight: 'bold' } },
          tooltip: { trigger: 'item', formatter: function (params) { return `${params.seriesName}<br/> ${data.xLabel || 'X'}: ${params.value[0]}<br/> ${data.yLabel || 'Y'}: ${params.value[1]}`; } },
          xAxis: { name: data.xLabel || 'X Axis', nameLocation: 'middle', nameGap: 30, type: 'value', splitLine: { lineStyle: { color: '#F3F4F6' } } },
          yAxis: { name: data.yLabel || 'Y Axis', nameLocation: 'middle', nameGap: 40, type: 'value', splitLine: { lineStyle: { color: '#F3F4F6' } } },
          series: [{ name: title, type: 'scatter', data: data.values || [], itemStyle: { color: '#F59E0B', opacity: 0.7 }, emphasis: { itemStyle: { color: '#B45309', opacity: 1 } } }]
        };
        break;
      default:
        option = {};
    }

    if (chartInstance.current) {
      chartInstance.current.setOption(option);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <div ref={chartRef} style={{ width, height }} className="min-h-[400px]" />
    </motion.div>
  );
}

export default AnalyticsChart;