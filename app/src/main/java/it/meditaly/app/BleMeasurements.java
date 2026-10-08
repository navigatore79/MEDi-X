package it.meditaly.app;
/** Bluetooth SIG 2A35 / 2A37 parsers; rejects truncated and non-finite measurements. */
final class BleMeasurements {
 static double sfloat(byte[] b,int i){if(i+1>=b.length)return Double.NaN;int word=(b[i]&255)|((b[i+1]&255)<<8),mantissa=word&0xfff;if(mantissa>=0x7fe&&mantissa<=0x802)return Double.NaN;int exponent=(word>>12)&15;if(exponent>=8)exponent-=16;if(mantissa>=0x800)mantissa-=0x1000;return mantissa*Math.pow(10,exponent);}
 static double[] pressure(byte[] b){
  if(b==null||b.length<7)return null;int flags=b[0]&255,required=7+((flags&2)!=0?7:0)+((flags&4)!=0?2:0)+((flags&8)!=0?1:0)+((flags&16)!=0?2:0);if(b.length<required)return null;
  double factor=(flags&1)!=0?7.500616827:1,s=sfloat(b,1)*factor,d=sfloat(b,3)*factor,map=sfloat(b,5)*factor;if(!Double.isFinite(s)||!Double.isFinite(d)||s<=0||d<=0)return null;
  int offset=7+((flags&2)!=0?7:0);double pulse=(flags&4)!=0?sfloat(b,offset):Double.NaN;return new double[]{s,d,map,pulse};
 }
 static int heart(byte[] b){if(b==null||b.length<2)return -1;boolean wide=(b[0]&1)!=0;if(wide&&b.length<3)return -1;int v=(b[1]&255)+(wide?((b[2]&255)<<8):0);return v>0?v:-1;}
}
