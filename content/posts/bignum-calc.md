---
title: 多精度数的四则运算-Java和Python实现
date: 2019-11-10 19:46:46
categories:
  - Algorithm
---

多精度数指的是位数超过1024Bit的数。由于这一类数的位数超过了计算机CPU寄存器表达，也就是超出了计算机的字长，所以不能够使用计算机进行直接的运算。除此之外，多精度数的大小也超出了计算机中定义的整型变量的最大大小，所以也不能使用标准的整型来存储这一类数，而需要使用数组或是字符串来存储。

对于多精度数的计算，目前有两种处理办法：
1. 模拟人们手工进行“竖式计算”的过程编写其加减乘除函数。
   这个方法的优点是操作逻辑符合人们的日常思维，易于理解，缺点是效率较低。
2. 将多精度数当作一个二进制流进行处理，使用各种移位和逻辑操作来进行加减乘除运算。
   这个方法的优点是执行效率高，缺点是代码极其复杂，可读性低，难以理解。

<!-- more -->

下面的算法都是基于第一种办法进行处理。

## 算法原理

先重新理一下竖式计算的流程：

- 加法在手工竖式计算中，当两个位相加得到的值大于`10`时就会产生一个进位值，并会在高一位的计算中把进位值也加入计算，这样从低位到高位一直计算直到计算结束为止。所以在算法中也需要定义一个进位值的变量。

![](https://pic.hujiekang.top/uploads/big/0ba49271293220bde14db7c42ced3326.png)

- 减法与加法类似，当被减数位小于减数位时，会产生一个退位值，即向更高一位去借10，来避免产生负数。若这一位产生了借位，那么高一位的计算中就要减去1再进行计算。所以在算法中也需要定义一个退位值的变量。

![](https://pic.hujiekang.top/uploads/big/2e003464c0b36a28e6dd325bc1f212c4.png)

- 乘法的运算在竖式计算中是把乘数逐位的与被乘数相乘，且运算结果随着乘数的位数向左移，最后再全部相加。所以在对单个结果位的处理中要考虑到三个因素：第一个是当前的计算结果；第二个是前一位产生的进位；第三个是之前的计算中在这一位得出的结果。

![](https://pic.hujiekang.top/uploads/big/3d9716af2b39030d118b904666931ab4.png)

- 除法在竖式运算中可以理解为是多次的减法。下图展示了除法算法的流程：

![](https://pic.hujiekang.top/uploads/big/3f19ef7d64ab57361bdb22f87211b785.png)

- 模指数运算
除此之外，还有多精度数的模指数运算，即计算以下式子的值：

$$\Large{a^e\space mod\space m} $$

可采用重复平方乘算法来实现：

![](https://pic.hujiekang.top/uploads/big/0cc2b4c2041dfc8ee92be8988f733319.png)

## 算法实现

理解了竖式计算的流程与规则后，就可以使用算法进行实现了。由于课程实验原因，我做了Java和Python两个语言的版本，其中Java里面使用了`ArrayList`对数进行存储，Python中则使用了列表`List`进行存储。

Java：

```java
// 导入对应模块
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class BigNum {

    /**
     * 此方法用于快速创建一个存储有多精度整数的ArrayList对象
     * 参数 elements 为整个整数的每一位数字
     * 返回 ArrayList<Integer>
     */
    public static ArrayList<Integer> createArrayList(int ... elements) {
        ArrayList<Integer> list = new ArrayList<Integer>();
        for (Integer element : elements) {
            list.add(element);
        }
        return list;
    }


    /**
     * 此方法用于比较两个数的大小。若第一个数大于等于第二个数则返回true，否则返回false
     * 参数 num1, num2 为要比较的数
     * 返回比较结果 boolean
     */
    public static boolean isBigger(ArrayList<Integer> num1, ArrayList<Integer> num2) {
        if(num1.size() < num2.size())  return false;
        else if(num1.size() > num2.size())  return true;
        else if(num1.size() == num2.size()){
            for (int i = 0; i < num1.size(); i++){
                if(num1.get(i)<num2.get(i))  return false;
                else if(num1.get(i)>num2.get(i)) return true;
            }
        }
        return true;
    }


    /**
     * 此方法用于实现两个多精度整数相加
     * 参数 num1, num2 为两个加数
     * 返回存储有运算结果的 ArrayList<Integer>
     */
    public static ArrayList<Integer> bigPlus (ArrayList<Integer> num1, ArrayList<Integer> num2){
        // 判断特殊情况
        if(num1.size() < num2.size()){
            ArrayList<Integer> tmp = num1;
            num1 = num2;
            num2 = tmp;
        }
        if(num1.isEmpty())  return num2;
        if(num2.isEmpty())  return num1;

        //数组索引反向，使数字的位数与索引对齐
        Collections.reverse(num1);
        Collections.reverse(num2);

        ArrayList result = new ArrayList(num1.size()+1);  //创建结果对象
        int c = 0;  //进位值
        for (int i = 0; i < num2.size(); i++){
            //判断是否进位
            if (num1.get(i) + num2.get(i) + c < 10){
                result.add(num1.get(i) + num2.get(i) + c);
                c = 0;
            }else{
                result.add(num1.get(i) + num2.get(i) + c - 10);
                c = 1;
            }
        }
        if(num1.size() == num2.size())  result.add(c);  //若两数位数相等，则最高位直接为进位值
        else{  //若两数位数不相等，把位数大的数的后续位直接与进位值相加，添加到结果中
            result.add(c+num1.get(num2.size()));
            for(int i : num1.subList(num2.size()+1,num1.size())){
                result.add(i);
            }
        }

        //把所有ArrayList的索引反向至正常状态
        Collections.reverse(result);
        Collections.reverse(num1);
        Collections.reverse(num2);

        //消除前导0
        if((int)result.get(0) == 0) {
            result.remove(0);
        }
        return result;
    }


    /**
     * 此方法用于实现两个多精度整数相减，若被减数小于减数则自动将两者调换后相减
     * 参数 num1 为被减数, num2 为减数
     * 返回存储有运算结果的 ArrayList<Integer>
     */
    public static ArrayList<Integer> bigSub (ArrayList<Integer> num1, ArrayList<Integer> num2){
        // 判断特殊情况
        if(num1 == num2 || (num1.isEmpty() && num2.isEmpty()))  return createArrayList(0);
        if(num1.isEmpty())  return num2;
        if(num2.isEmpty())  return num1;
        if(!BigNum.isBigger(num1,num2)){
            System.out.println("检测到减数大于被减数，已自动将减数与被减数交换");
            ArrayList<Integer> tmp = num1;
            num1 = num2;
            num2 = tmp;
        }

        //数组索引反向，使数字的位数与索引对齐
        Collections.reverse(num1);
        Collections.reverse(num2);

        ArrayList result = new ArrayList(num1.size());  //创建结果对象
        int c = 0;  //借位值
        for (int i = 0; i<num2.size();i++){
            //判断是否借位
            if(num1.get(i) - num2.get(i) + c >= 0){
                result.add(num1.get(i) - num2.get(i) + c);
                c = 0;
            }else{
                result.add(num1.get(i) - num2.get(i) + c + 10);
                c = -1;
            }
        }

        //若两数位数不相等，把位数大的数的后续位直接与进位值相加，添加到结果中
        if(num1.size() > num2.size()){
            result.add(c+num1.get(num2.size()));
            for(int i : num1.subList(num2.size()+1,num1.size()))  result.add(i);
        }

        //把所有ArrayList的索引反向至正常状态
        Collections.reverse(result);
        Collections.reverse(num1);
        Collections.reverse(num2);

        //消除前导0
        if((int)result.get(0) == 0) {
            result.remove(0);
        }
        return result;
    }


    /**
     * 此方法用于实现两个多精度整数相乘
     * 参数 num1, num2 为两个乘数
     * 返回存储有运算结果的 ArrayList<Integer>
     */
    public static ArrayList<Integer> bigMult (ArrayList<Integer> num1, ArrayList<Integer> num2){

        //数组索引反向，使数字的位数与索引对齐
       if(num1.hashCode()==num2.hashCode()){
           Collections.reverse(num1);
       }else{
           Collections.reverse(num1);
           Collections.reverse(num2);
       }


        ArrayList result = new ArrayList(num1.size()+num2.size());  //创建结果对象
        int uv = 0;  //乘法临时值

        for (int i = 0; i<num1.size()+num2.size()+1; i++)  result.add(0);  //结果所有位置为0

        for (int i = 0; i<num1.size(); i++){
            int c = 0;  //进位值
            for (int j = 0; j<num2.size(); j++){
                uv = (int)result.get(i+j) + num1.get(i) * num2.get(j) + c;  //按手工计算的方式进行逐位的运算
                result.set(i+j, uv%10);
                c = uv/10;
            }
            result.set(i+num2.size(), uv/10);
        }

        //把所有ArrayList的索引反向至正常状态
        Collections.reverse(result);
        if(num1.hashCode()==num2.hashCode()){
            Collections.reverse(num1);
        }else{
            Collections.reverse(num1);
            Collections.reverse(num2);
        }

        //消除前导0
        while((int)result.get(0) == 0) {
            result.remove(0);
        }
        return result;
    }


    /**
     * 此方法用于实现两个多精度整数相除
     * 参数 num1 为被除数, num2 为除数
     * 返回存储有运算结果的 List<ArrayList<Integer>>, List 中第一项为商，第二项为余数
     * @return
     */
    public static List bigDiv (ArrayList<Integer> num1, ArrayList<Integer> num2){

        if(num1 == num2) {  //若两数相等，返回商为1，余数为0
            return Arrays.asList(createArrayList(1),createArrayList(0));
        }
        if(num2.get(0) == 0 && num2.size() == 1){  //若除数为0，返回-1
            System.out.println("除数不得为0");
            return Arrays.asList(createArrayList(-1),createArrayList(0));
        }
        if(!BigNum.isBigger(num1,num2)){  //若除数大于被除数，则商为0，余数为被除数的值
            return Arrays.asList(createArrayList(0),num1);
        }

        while(num1.get(0)==0){  //消除产生的前导0
            num1.remove(0);
        }
        while(num2.get(0)==0){  //消除产生的前导0
            num2.remove(0);
        }

        //创建并初始化结果对象
        ArrayList result = new ArrayList();
        for (int i=0;i<num1.size()-num2.size()+1;i++){
            result.add(i,0);
        }

        //为除数扩充0至位数与被除数相等，并计算扩大的倍数
        ArrayList num2_duiqi = (ArrayList) num2.clone();
        int mult_times = 0;  //扩大倍数
        int times = 0;  //除法结果
        while(num2_duiqi.size()!=num1.size()){
            num2_duiqi.add(0);
            mult_times++;
        }

        while(true) {
            while (BigNum.isBigger(num1, num2_duiqi)) {  //逐次相减，并在结果中乘以对应的倍数
                num1 = BigNum.bigSub(num1, num2_duiqi);
                if(num1.size()!=0){
                    while(num1.get(0)==0){  //消除产生的前导0
                        num1.remove(0);
                        if(num1.isEmpty()){
                            break;
                        }
                    }
                }
                times++;
            }
            result.set(mult_times, times);  //结果中填入结果
            times = 0;  //除法结果重置

            //除完一轮重新对齐，并修改扩大的倍数
            if ((int) num2_duiqi.get(num2_duiqi.size() - 1) == 0 && num2_duiqi.size() > num2.size()){
                num2_duiqi.remove(num2_duiqi.size() - 1);
                mult_times--;
            }
            else{  //除到末位后，将结果的索引反向
                Collections.reverse(result);
                break;
            }
        }
        //返回结果
        if(num1.size()==0){
            return Arrays.asList(result,createArrayList(0));
        }
        return Arrays.asList(result,num1);
    }


    public static ArrayList bigPow (ArrayList<Integer> a, ArrayList<Integer> k, ArrayList<Integer> m){
        ArrayList A = (ArrayList)a.clone();  //A=a
        ArrayList b = createArrayList(1);  //令b=1
        if(k.isEmpty() || (k.size()==1 && k.get(0)==0))  return b;  //如果k=0，则返回b

        List kk;
        ArrayList<Integer> k1 = (ArrayList<Integer>)k.clone();
        ArrayList k2 = new ArrayList();
        while(!(k1.size()==1&&k1.get(0)==0)){  //将k转换为二进制，结果为k2
            kk = BigNum.bigDiv(k1,createArrayList(2));
            k1 = (ArrayList<Integer>) kk.get(0);
            k2.add(((ArrayList) kk.get(1)).get(0));
        }

        if((int)k2.get(0)==1){  //如果k0=1，则b=a
            b= (ArrayList) a.clone();
        }
        for(int i = 1;i<k2.size();i++){
            A = (ArrayList) BigNum.bigDiv(BigNum.bigMult(A,A), m).get(1);
            if((int)k2.get(i)==1){
                b = (ArrayList) BigNum.bigDiv(BigNum.bigMult(A,b), m).get(1);
            }
        }

        return b;
    }
}
```

Python（注释可参考Java版本）：

```python
class BigNum:

    @staticmethod
    def __isBigger(num1, num2):
        if len(num1) < len(num2):
            return False
        elif len(num1) > len(num2):
            return True
        elif len(num1) == len(num2):
            for i in range(0, len(num1)):
                if num1[i]<num2[i] :
                    return False
                elif num1[i]>num2[i] :
                    return True
        return True


    @staticmethod
    def bigPlus(n1, n2):
        if len(n1) < len(n2):
            n1, n2 = n2, n1
        if n1 == []:
            return n2
        if n2 == []:
            return n1

        num1 = list(reversed(n1))
        num2 = list(reversed(n2))
        result = []
        c = 0
        for i in range(0, len(num2)):
            if num1[i] + num2[i] + c < 10 :
                result.append(num1[i] + num2[i] + c)
                c = 0
            else:
                result.append(num1[i] + num2[i] + c - 10)
                c = 1
        if len(num1) == len(num2):
            result.append(c)
        else:
            result.append(c+num1[len(num2)])
            for each in num1[len(num2)+1:]:
                result.append(each)

        result.reverse()
        if result[0] == 0:
            result.pop(0)
        return result


    @staticmethod
    def bigSub(n1, n2):
        if n1 == n2 or (n1 == [] and n2 == []):
            return [0,]
        if n1 == []:
            return n2
        if n2 == []:
            return n1
        elif not BigNum.__isBigger(n1, n2):
            print("检测到减数大于被减数，已自动将减数与被减数交换")
            n1, n2 = n2, n1

        num1 = list(reversed(n1))
        num2 = list(reversed(n2))
        result = []
        c = 0
        for i in range(0, len(num2)):
            if(num1[i] - num2[i] + c >= 0):
                result.append(num1[i] - num2[i] + c)
                c = 0
            else:
                result.append(num1[i] - num2[i] + c + 10)
                c = -1
        if len(num1) > len(num2):
            result.append(c+num1[len(num2)])
            for each in num1[len(num2)+1:]:
                result.append(each)
        result.reverse()
        if result[0] == 0:
            result.pop(0)

        return result


    @staticmethod
    def bigMult(num1, num2):
        num1.reverse()
        num2.reverse()

        result = []
        uv = 0
        for i in range(0, len(num1) + len(num2) + 1):
            result.append(0)
        for i in range(0, len(num1)):
            c = 0
            for j in range(0, len(num2)):
                uv = result[i+j] + int(num1[i]) * int(num2[j]) + c
                result[i+j] = uv % 10
                c = uv // 10
            result[i+len(num2)] = uv // 10
        result.reverse()
        num1.reverse()
        num2.reverse()
        while result[0] == 0:
            result.pop(0)
        return result


    @staticmethod
    def bigDiv(num1, num2):
        if num1 == num2:
            return [1,], [0,]
        elif not BigNum.__isBigger(num1, num2):
            print("检测到除数大于被除数，已自动将除数与被除数交换")
            num1, num2 = num2, num1
        if num2[0]==0 and len(num2)==1:
            print("除数不得为0")
            return [-1,], [0,]

        result = []
        for i in range(0, len(num1)-len(num2)+1):
            result.append(0)

        num2_duiqi = num2[:]
        mult_times = 0
        times = 0

        while len(num2_duiqi)!=len(num1):
            num2_duiqi.append(0)
            mult_times+=1

        while True:
            while BigNum.__isBigger(num1, num2_duiqi):
                num1 = BigNum.bigSub(num1, num2_duiqi)
                while num1[0]==0:
                    num1.pop(0)
                times+=1
            result[mult_times] = times
            times = 0

            if num2_duiqi[len(num2_duiqi)-1]==0 and len(num2_duiqi)>len(num2):
                num2_duiqi.pop(len(num2_duiqi)-1)
                mult_times-=1
            else:
                result.reverse()
                break

        return result, num1
```
