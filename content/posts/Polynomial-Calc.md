---
title: 有关多项式的算法——四则运算、求逆
date: 2019-12-18 14:04:24
categories:
  - Algorithm
---

## 算法介绍

多项式的运算可以说比之前的多精度数运算还要简单一点，因为多项式的加减只能存在于同次数的项之间，所以不需要考虑加减法里面的进位退位问题，这也就使得乘除法简单了很多。

加减法的原理就没什么好说的了，乘除法都是基于多精度数的算法修改的，存储多项式也使用了`ArrayList`，索引值对应项的次数，其元素大小对应项的系数。

<!-- more -->

求逆则使用了欧几里得算法：

![](https://pic.hujiekang.top/uploads/medium/dc44f5fa20f90f22e7d25887ca9dc5f5.jpg)

以及有限域 $F_{2^8}$ 上基于指数对数表的乘法和求逆，对应的不可约多项式 $f(x)=x^8+x^6+x^5+x+1$ 。

指数对数表的构建方法如下：
1. 将元素$02$表示成为$\alpha$，依次计算 $\alpha^i\space modf(\alpha)\space,i=0,1,\cdots, 254$ ,将所得结果转变为十进制数，设为$\beta_i ,i=0,1,\cdots, 254$；
2. 建表。第一行为 $\alpha_i ,i=0,1,\cdots, 254$，第二行元素依次为 $\beta_i ,i=0,1,\cdots, 254$。由于 $\alpha^0\equiv\alpha^{255}\space modf(\alpha)$，约定第$2$行，第$255$列元素为$0$；

|0|1|2|3|...|253|254|255|
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|1|2|4|8|...|233|177|0|

3. 按所建表的第二行元素的大小进行重排列；

|255|0|1|197|...|72|230|104|
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|0|1|2|3|...|253|254|255|

4. 将（3）中表的第一行放在（2）中表的第三行。

|序号|0|1|2|3|...|253|254|255|
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
|$(02)^i$|1|2|4|8|...|233|177|0|
|$log_{(02)^i}$|255|0|1|197|...|72|230|104|

建立上述指数对数表之后，通过查表很容易求出两个元素的乘积。又由于对于 $i=0,1,\cdots, 254$ 均有 $(\alpha^i)^{-1}\equiv\alpha^{255-i}mod(f(\alpha))$ ，所以可通过查表也很容易求出元素的逆元。

下面是完整代码：

## 有理数域的多项式计算算法

```Java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/***************************************
 *   Created By HuJiekang on 2019/12/12.   *
 ***************************************/

public class Polynomial {


    /**
     * 此方法用于快速创建一个ArrayList对象
     * @param  elements 为整个整数的每一位数字
     * @return  ArrayList<Double>
     */
    public static ArrayList<Double> CreateArrayList(double ... elements) {
        ArrayList<Double> list = new ArrayList<>();
        for (Double element : elements) {
            list.add(element);
        }
        return list;
    }

    /**
     * 此方法用于比较两个数的大小。若第一个数大于等于第二个数则返回true，否则返回false
     * @params  num1, num2 为要比较的数
     * @return  返回比较结果 boolean
     */
    public static boolean isBigger(ArrayList<Double> num1, ArrayList<Double> num2) {
        if(num1.size() < num2.size())  return false;
        else if(num1.size() > num2.size())  return true;
        else {
            for (int i = num1.size()-1; i >=0; i--){
                if(num1.get(i)<num2.get(i))  return false;
                else if(num1.get(i)>num2.get(i)) return true;
            }
        }
        return true;
    }

    /**
     * 此方法用于将一个多项式格式化输出为∑aix^i的形式
     * @param d 要输出的多项式
     * @return void
     */
    public static void DisplayPolynomial(ArrayList<Double> d){
        for(int i = 0;i<d.size();i++){
            if(d.get(i)==0.0) continue;
            if(i==0) System.out.print(d.get(i));
            else if(i==1) System.out.print(d.get(i)+" * x");
            else{
                System.out.print(d.get(i)+" * x^"+i);
            }
            if(i==d.size()-1)  break;
            else System.out.print(" + ");
        }
    }


    /**
     * 此方法实现了多项式的加法计算
     * @params pol1,pol2 要进行运算的两个多项式
     * @return ArrayList<Double>
     */
    public static ArrayList<Double> PolynomialPlus(ArrayList<Double> pol1, ArrayList<Double> pol2){
        ArrayList<Double> result = new ArrayList<>();
        int i;
        for(i = 0;i<Math.min(pol1.size(), pol2.size());i++){
            result.add(i, pol1.get(i)+pol2.get(i));
        }
        for(;i<Math.max(pol1.size(), pol2.size());i++){
            result.add(i, pol1.size()>=pol2.size()?pol1.get(i):pol2.get(i));
        }
        while(result.get(result.size()-1)==0) {
            result.remove(result.size() - 1);
        }
        return result;
    }


    /**
     * 此方法实现了多项式的减法计算
     * @params pol1,pol2 要进行运算的两个多项式
     * @return ArrayList<Double>
     */
    public static ArrayList<Double> PolynomialSub(ArrayList<Double> pol1, ArrayList<Double> pol2){
        ArrayList<Double> result = new ArrayList<>();
        int i;
        for(i = 0;i<Math.min(pol1.size(), pol2.size());i++){
            result.add(i, pol1.get(i)-pol2.get(i));
        }
        for(;i<Math.max(pol1.size(), pol2.size());i++){
            result.add(i, pol1.size()>=pol2.size()?pol1.get(i):pol2.get(i)*-1);
        }
        while(result.get(result.size()-1)==0) {
            result.remove(result.size() - 1);
        }
        return result;
    }


    /**
     * 此方法实现了多项式的乘法计算
     * @params pol1,pol2 要进行运算的两个多项式
     * @return ArrayList<Double>
     */
    public static ArrayList<Double> PolynomialMult(ArrayList<Double> pol1, ArrayList<Double> pol2){
        ArrayList<Double> result = new ArrayList<>();
        for(int i = 0;i<=pol1.size()-1+pol2.size()-1;i++){
            result.add(0.0);
        }
        for(int i = 0;i<pol1.size();i++){
            for(int j = 0;j<pol2.size();j++){
                result.set(i+j, result.get(i+j)+pol1.get(i)*pol2.get(j));
            }
        }
        return result;
    }


    /**
     * 此方法实现了多项式的带余除法计算
     * @params pol1,pol2 要进行运算的两个多项式
     * @return 包含结果的List
     */
    public static List<ArrayList<Double>> PolynomialDiv(ArrayList<Double> pol1, ArrayList<Double> pol2){
        if(pol2==null||(pol2.size()==1&&pol2.get(0)==0.0)) throw new ArithmeticException("/ by zero");
        if(pol1 == pol2) return Arrays.asList(CreateArrayList(1.0),CreateArrayList(0.0));
        if(pol1==null||(pol1.size()==1&&pol1.get(0)==0.0)) return Arrays.asList(CreateArrayList(0.0), CreateArrayList(0.0));
        if(!isBigger(pol1, pol2)) return Arrays.asList(CreateArrayList(0.0), pol1);

        ArrayList<Double> result = new ArrayList<>();
        for (int i=0;i<pol1.size();i++){
            result.add(i,0.0);
        }

        ArrayList<Double> pol2_duiqi = (ArrayList<Double>) pol2.clone();
        int mult_times = 0;
        double times;
        while(pol2_duiqi.size()!=pol1.size()){
            pol2_duiqi.add(0, 0.0 );
            mult_times++;
        }

        while(true) {
            if(pol1.size()==0) break;
            if(pol1.size()==pol2_duiqi.size()){
                times = pol1.get(pol1.size()-1)/pol2_duiqi.get(pol1.size()-1);
                for(int i = 0;i<pol1.size();i++){
                    pol1.set(i, pol1.get(i)-pol2_duiqi.get(i)*times);
                }
                pol1.set(pol1.size()-1, 0.0);
            }else{
                times = 0.0;
            }

            if(pol1.size()!=0){
                while(pol1.get(pol1.size()-1)==0){
                    pol1.remove(pol1.size()-1);
                    if(pol1.isEmpty()){
                        break;
                    }
                }
            }

            result.set(mult_times, times);

            if (pol2_duiqi.get(0) == 0 && pol2_duiqi.size() > pol2.size()){
                pol2_duiqi.remove(0);
                mult_times--;
            }
            else{
                break;
            }
        }

        while(result.get(result.size()-1)==0){
            result.remove(result.size()-1);
        }

        if(pol1.size()==0){
            return Arrays.asList(result,CreateArrayList(0));
        }
        return Arrays.asList(result,pol1);
    }


    /**
     * 此方法实现了扩展的欧几里得算法，用于计算多项式的逆元
     * @params pol1,pol2 要进行运算的两个多项式
     * @return 包含结果的List
     */
    public static List<ArrayList<Double>> Euclid(ArrayList<Double> pol1, ArrayList<Double> pol2){
        if(pol2==null||(pol2.size()==1&&pol2.get(0)==0.0)) return Arrays.asList(pol1, CreateArrayList(1.0), CreateArrayList(0.0));

        ArrayList<Double> u1x = CreateArrayList(0.0);
        ArrayList<Double> u2x = CreateArrayList(1.0);
        ArrayList<Double> v1x = CreateArrayList(1.0);
        ArrayList<Double> v2x = CreateArrayList(0.0);
        ArrayList<Double> qx;
        ArrayList<Double> rx;
        ArrayList<Double> ux;
        ArrayList<Double> vx;
        List tmp;

        while(!(pol2.size() == 1 && pol2.get(0) == 0.0)){
            tmp = PolynomialDiv(pol1, pol2);
            qx = (ArrayList<Double>) tmp.get(0);
            rx = (ArrayList<Double>) tmp.get(1);

            ux = PolynomialSub(u2x, PolynomialMult(qx, u1x));
            vx = PolynomialSub(v2x, PolynomialMult(qx, v1x));
            pol1 = pol2;
            pol2 = rx;
            u2x = u1x;
            u1x = ux;
            v2x = v1x;
            v1x = vx;
        }
        return Arrays.asList(pol1, u2x, v2x);
    }
}
```

## GF(256)域的多项式计算算法

```Java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/***************************************
 *   Created By HuJiekang on 2019/12/15.   *
 ***************************************/
public class Galois_256 {

    //2^8域上的8次不可约多项式
    public static final int IRREDUCIBLE_POLYNOMIAL = 355;


    public static void main(String[] args) {
        ArrayList<Integer> d1 = CreateArrayList(2);
        ArrayList<Integer> d2 = CreateArrayList(139);
        for (int i = 1; i < 256; i++) {
            System.out.print(i + "^-1=" + ArrayListToInt(GaloisInverseWithSheet(CreateArrayList(i))));
            System.out.println("\t"+i + "^-1=" + ArrayListToInt(GaloisEuclid(CreateArrayList(i))));
        }
    }


    /**
     * 此方法用于快速创建一个ArrayList对象
     *
     * @param element 为一个数字
     * @return ArrayList<Integer>
     */
    public static ArrayList<Integer> CreateArrayList(int element) {
        ArrayList<Integer> list = new ArrayList<>();
        String[] s = Integer.toBinaryString(element).split("");
        for (String ss : s) {
            list.add(Integer.parseInt(ss));
        }
        while (list.size() < 8) list.add(0, 0);
        return list;
    }


    /**
     * 此方法用于比较两个数的大小。若第一个数大于等于第二个数则返回true，否则返回false
     * 参数 num1, num2 为要比较的数
     * 返回比较结果 boolean
     */
    public static boolean isBigger(ArrayList<Integer> num1, ArrayList<Integer> num2) {
        if (num1.size() < num2.size()) return false;
        else if (num1.size() > num2.size()) return true;
        return true;
    }


    /**
     * 此方法用于将多项式对象转化为2^8域上对应的序号
     *
     * @param element 要进行转换的多项式
     * @return int
     */
    public static int ArrayListToInt(ArrayList<Integer> element) {
        String s = "";
        for (int i : element) {
            s += String.valueOf(i);
        }
        return Integer.parseInt(s, 2);
    }


    /**
     * 此方法实现了2^8有限域上的多项式加法
     *
     * @return ArrayList<Integer>
     * @params pol1, pol2
     */
    public static ArrayList<Integer> GaloisPlus(ArrayList<Integer> pol1, ArrayList<Integer> pol2) {
        ArrayList<Integer> result = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            result.add(i, pol1.get(i) ^ pol2.get(i));
        }
        return result;
    }


    /**
     * 此方法实现了2^8有限域上的多项式减法
     *
     * @return ArrayList<Integer>
     * @params pol1, pol2
     */
    public static ArrayList<Integer> GaloisSub(ArrayList<Integer> pol1, ArrayList<Integer> pol2) {
        ArrayList<Integer> result = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            result.add(i, pol1.get(i) ^ pol2.get(i));
        }
        return result;
    }


    /**
     * 此方法实现了2^8有限域上的多项式乘法
     *
     * @return ArrayList<Integer>
     * @params pol1, pol2
     */
    public static ArrayList<Integer> GaloisMult(ArrayList<Integer> pol1, ArrayList<Integer> pol2) {
        ArrayList<Integer> result = new ArrayList<>();
        for (int i = 0; i <= pol1.size() - 1 + pol2.size() - 1; i++) {
            result.add(0);
        }
        for (int i = 0; i < pol1.size(); i++) {
            for (int j = 0; j < pol2.size(); j++) {
                result.set(i + j, result.get(i + j) ^ (pol1.get(i) & pol2.get(j)));
            }
        }
        while (result.size() > 8 && result.get(0) == 0) result.remove(0);
        return GaloisDiv(result, CreateArrayList(IRREDUCIBLE_POLYNOMIAL)).get(1);
    }


    /**
     * 此方法实现了2^8有限域上的多项式带余除法
     *
     * @param pol1 被除式
     * @param pol2 除式
     * @return 余式
     */
    public static List<ArrayList<Integer>> GaloisDiv(ArrayList<Integer> pol1, ArrayList<Integer> pol2) {
        boolean isZero1 = true;
        boolean isZero2 = true;
        for (int i : pol1) {
            if (i != 0) {
                isZero1 = false;
                break;
            }
        }
        for (int i : pol2) {
            if (i != 0) {
                isZero2 = false;
                break;
            }
        }
        if (pol2 == null || isZero2) throw new ArithmeticException("/ by zero");
        if (pol1 == pol2) return Arrays.asList(CreateArrayList(1), CreateArrayList(0));
        if (pol1 == null || isZero1) return Arrays.asList(CreateArrayList(0), CreateArrayList(0));
        ArrayList<Integer> pol2_duiqi = (ArrayList<Integer>) pol2.clone();
        while (pol2_duiqi.get(0) == 0) pol2_duiqi.remove(0);
        while (pol1.get(0) == 0) pol1.remove(0);
        if (!isBigger(pol1, pol2_duiqi)) {
            while (pol1.size() < 8) pol1.add(0, 0);
            return Arrays.asList(CreateArrayList(0), pol1);
        }

        ArrayList<Integer> result = new ArrayList<>();
        for (int i = 0; i < pol1.size(); i++) {
            result.add(i, 0);
        }

        int orgSize = pol2_duiqi.size();
        int multTimes = 0;
        int times = 0;
        while (pol2_duiqi.size() != pol1.size()) {
            pol2_duiqi.add(pol2_duiqi.size(), 0);
            multTimes++;
        }

        while (true) {
            if (pol1.size() == pol2_duiqi.size()) {
                for (int i = 0; i < pol1.size(); i++) {
                    pol1.set(i, pol1.get(i) ^ pol2_duiqi.get(i));
                }
                times = 1;
            }
            if (pol1.size() != 0) {
                while (pol1.get(0) == 0) {
                    pol1.remove(0);
                    if (pol1.size() < orgSize) {
                        break;
                    }
                }
            }
            result.set(multTimes, times);
            if (pol2_duiqi.get(pol2_duiqi.size() - 1) == 0 && pol2_duiqi.size() > orgSize) {
                pol2_duiqi.remove(pol2_duiqi.size() - 1);
                multTimes--;
            } else {
                break;
            }
            times = 0;
        }
        Collections.reverse(result);
        while (result.size() > 8 && result.get(0) == 0) result.remove(0);
        while (pol1.size() < 8) pol1.add(0, 0);
        while (result.size() < 8) result.add(0, 0);
        return Arrays.asList(result, pol1);
    }


    /**
     * 此方法实现了2^8有限域上的多项式扩展欧几里得算法
     *
     * @param fx 要进行计算的多项式
     * @return 多项式逆元
     */
    public static ArrayList<Integer> GaloisEuclid(ArrayList<Integer> fx) {
        ArrayList<Integer> gx = CreateArrayList(IRREDUCIBLE_POLYNOMIAL);
        ArrayList<Integer> u1x = CreateArrayList(0);
        ArrayList<Integer> u2x = CreateArrayList(1);
        ArrayList<Integer> v1x = CreateArrayList(1);
        ArrayList<Integer> v2x = CreateArrayList(0);
        ArrayList<Integer> qx;
        ArrayList<Integer> rx;
        ArrayList<Integer> ux;
        ArrayList<Integer> vx;
        List tmp;

        boolean isOne = true;
        for (int i = 0; i < fx.size(); i++) {
            if (fx.get(i) != v1x.get(i)) isOne = false;
        }
        if (isOne) return CreateArrayList(0);

        while (true) {
            boolean isZero = true;
            for (int i : gx) {
                if (i != 0) isZero = false;
            }
            if (isZero) break;

            tmp = GaloisDiv(fx, gx);
            qx = (ArrayList<Integer>) tmp.get(0);
            rx = (ArrayList<Integer>) tmp.get(1);

            ux = GaloisSub(u2x, GaloisMult(qx, u1x));
            vx = GaloisSub(v2x, GaloisMult(qx, v1x));
            fx = gx;
            gx = rx;
            u2x = u1x;
            u1x = ux;
            v2x = v1x;
            v1x = vx;
        }
        return u2x;
    }


    /**
     * 此方法生成2^8域的指数对数表
     *
     * @return int[][]
     */
    public static int[][] LogarithmSheet() {
        int[][] sheet = new int[2][256];
        ArrayList<Integer> baseElement = CreateArrayList(2);
        ArrayList<Integer> element = CreateArrayList(1);

        sheet[0][255] = 0;
        for (int i = 0; i < 255; i++) {
            sheet[0][i] = ArrayListToInt(element);
            element = GaloisMult(element, baseElement);
        }
        for (int i = 0; i < 256; i++) {
            sheet[1][sheet[0][i]] = i;
        }
        return sheet;
    }


    /**
     * 此方法使用指数对数表计算2^8域上的多项式乘法
     *
     * @return ArrayList<Integer>
     * @params pol1, pol2
     */
    public static ArrayList<Integer> GaloisMultWithSheet(ArrayList<Integer> pol1, ArrayList<Integer> pol2) {
        int[][] sheet = LogarithmSheet();
        int num1 = ArrayListToInt(pol1);
        int num2 = ArrayListToInt(pol2);
        return CreateArrayList(sheet[0][(sheet[1][num1] + sheet[1][num2]) % 255]);
    }


    /**
     * 此方法使用指数对数表计算2^8域上的多项式多项式逆元
     *
     * @param pol 要求逆元的多项式
     * @return ArrayList<Integer>
     */
    public static ArrayList<Integer> GaloisInverseWithSheet(ArrayList<Integer> pol) {
        int[][] sheet = LogarithmSheet();
        int num = ArrayListToInt(pol);
        return CreateArrayList(sheet[0][255 - sheet[1][num]]);
    }
}
```

## 参考资料
- [https://blog.csdn.net/highlongsong/article/details/99486924](https://blog.csdn.net/highlongsong/article/details/99486924)
