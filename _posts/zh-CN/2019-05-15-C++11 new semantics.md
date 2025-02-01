---
layout: post
title: C++11新特性之——新语义
lang: zh-CN
---

本文是C++11新特性系列的第二篇们主要记录C++11的新语意。

<!--more--> 

### 2，新的语义
##### 2.1 大括号{}与初始化
C++11之前，有这么几种初始化的方式
1. 默认初始化: A a; //调用默认构造函数
2. 值初始化：A a=1; //调用单参构造函数
3. 直接初始化: A a(1);//调用单参构造函数
4. 拷贝初始化: A a2(a1);  A a2 = a1;//调用拷贝构造函数

C++11之后，增加列表初始化，也叫统一初始化。上面的四种初始化可以用统一的形式了：
1. 默认初始化: A a{}; 
2. 值初始化：A a = {1}; //调用单参构造函数
3. 直接初始化: A a{1};//调用单参构造函数
4. 拷贝初始化: A a2{a1};  A a2 = a1;//调用拷贝构造函数

不过，值得注意的是，当用于初始化内置类型的变量时，若大括号中的值有丢失信息的风险，编译器会给出报错：
~~~cpp
int a{1.5}; //编译不通过
int b(1.5); //编译通过，转换成1
~~~
除了用于上述的初始化，大括号还可用于返回值（返回初始化列表）、初始化容器(前提是容器实现了以initialize_list为参数的构造函数)
~~~cpp
vector<string> strArr{"hello", "how", "are", "you"}
vector<string>  func(){
	return {"fine", "thanks"};
}
~~~
爽爆了有木有。
初始化方面，除了大括号这一利器，C++11还实现了委托构造函数，能够实现构造函数的代码复用：
~~~cpp
class Demo{
public:
	Demo(int _x, int _y):a{_x},b{_y}{} //大括号也可用与类的初始化列表
	Demo():Demo(0,0){}				   //Demo()将构造操作委托给Demo(int,int)
	Demo(int _x):Demo(_x, 0){}
private:
	int a;
	int b;
}
~~~
在C++11的委托构造函数之前，假如多个构造函数有一些相同的构造动作，一般都是独立出一个init私有函数，现在有了委托构造函数，代码更加直观、优雅。
**类内初始值**也是一个令人欣喜的特性，C++11之前，成员变量在类内声明时不能指定初始值——要放到类外进行定义，C++11的类内初始化则极大地方便了成员变量的初始值的指定：
~~~cpp
class CC{
public:
    CC() {}
    ~CC() {}
private:
    int a{7}; 				// 类内初始化，C++11 可用
    const int b{8};			// 类内初始化，C++11 可用
    static int c{1};		// 不支持static的成员指定类内初始化值
    static const int d{4};	// 但支持static const的成员指定类内初始化值
};
int CC::c{2};				// c依然需要像C++98一样初始化。			
~~~
#### 2.2 右值引用
右值引用牵出了很多骚操作——引用折叠、通用引用、移动语意(std::move)、完美转发(std::forward)、移动构造函数、移动赋值操作符等，在这几个特性的加持下，旧的C++代码无需改动、只升级编译器版本、升级STL库即可大幅提升性能。
引用折叠规则是通用引用（universal reference）的基础，而通用引用则是STL实现move与forward等库函数的基础，[这篇博客](https://blog.csdn.net/JohnnyMartin/article/details/83021105)有介绍右值引用、move与forward的使用，[这篇](https://blog.csdn.net/JohnnyMartin/article/details/83032499)则介绍了引用折叠与通用引用以及move与forward的的实现，本篇博文不再重复。
#### 2.3 lambda表达式
lambda表达式代表一个可调用的代码单元，可以将其理解为一个匿名的内联函数，特别的是，lambda可以定义在函数内部——又爽爆了有木有:-)。它有参数列表、返回值、函数体，这些都跟普通函数很像，但是lambda多了一个捕获列表：
~~~cpp
int func(){
int data{0};
auto myFuncA = [data](int a)->int{...};
auto myFuncB = []{...}; //参数列表跟返回值列表都是可省略的
}
~~~
中括号里的内容便是捕获列表，func定义的局部变量只有在捕获列表中声明了才能在一个lambda中使用:myFuncA 内部可以使用data但myFuncB不能，全局变量则可以在lambda中自由使用9。捕获列表有以下几种形式：
>*  [] : 空捕获列表
>*   ]:按值或按引用捕获
>* [=] : 隐式捕获列表，按值捕获所有局部变量
>* [&] : 隐式捕获列表，按引用捕获所有局部变量
>* [&, a, b...] : a, b...按值捕获，剩下的局部变量按引用捕获
>* [=, a, b...] : a, b...按引用捕获，剩下的局部变量按值捕获

lambda的返回值类型可以显式指定，也可由编译器推断。其他函数的返回值类型要到C++14才支持自动推断。
#### 2.4 尾置返回类型
C/C++里函数的返回值都是放在函数名的前面的——前置的。当返回值的类型很复杂的时候，函数的原型就显得十分不易阅读，例如一个返回数组指针的函数：
~~~cpp
int (*func(int param))[10]{
.....
}
~~~
这种形式的函数声明看上去非常绕——得琢磨一会才能分析出参数、返回值等信息，尾置返回类型在此时就非常有优势了：
~~~cpp
auto func(int param) -> int (*) [10]{
......
}
~~~
跟上一节的lambda的定义方式很相似——都是把返回值放在"->"后面
#### 2.6 范围for
C++11的诸多特性使得C++代码跟之前的代码大不一样了，满眼的auto、T&&。。。还有范围for。在C++11之前，我们遍历一个普通数组、一个vector，要这样子：
~~~cpp
int arr[10] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
for (int i = 0; i < 10; i++)
	cout << arr[i];
std::vector<int> vec;
......
for (std::vector<int>::iterator itr = vec.begin(); itr != vec.end(); itr++)
	std::cout << *itr;
~~~
有了范围for，就可以这样子：
~~~cpp
int arr[10] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
for (auto n : arr)
	std::cout << n;
std::vector<int> vec {1,2,3,4,5,6,7,8,9,10};
for (auto n :vec)
	std::cout << n;
~~~
又双爽翻了！！！少敲N多代码！！！不过在范围for中，那些会使迭代器失效的操作要谨慎使用（老版本for遍历时也有同样问题）。
#### 2.7 using、extern
using关键字存在很久了，最常见的“using namespace std;”。在C++11里它被额外赋予了以下几种作用：
**类型别名** 。早在C时代，就可以用#define、typedef来定义别名，不过二者使用起来让人很别扭：经常分不清那个新名称哪个是已有的名称。使用C++11的using，将新名称放在了等号的左边、已有的名称放在右边，则十分清晰、直观、易读。另外，using还可以用于模板的别名，typedef则做不到这点。
~~~cpp
#define MyIntA int
typedef int MyIntB;
using MyIntC = int; //C++11
template<typename T>class TClass{ .......};

using TClass_Int = TClass<int>;
~~~
using的另一个新功能: **更改父类成员的可见性** 。Drive通过私有继承Base，原本Base中的a、b在子类中都会变成private，但是使用using可以更改二者的可见性：
~~~cpp
class Base{
public: 
	int a;
protected:
	int b;
private:
	int c;
}
class Drive:private Base{
public:
	using Base::a;//OK
protected:
	using Base::b;//OK
	using Base::c;//编译出错，无法访问父类的私有成员，因而无法更改可见性
}
~~~

**继承父类构造函数**也是C++11赋予using的新功能。子类可以继承自己的**直接父类**的所有构造函数：

extern也是很早就有的关键字了，常见的用法有以下几种：
>* 具有外部连接的静态存储期说明。 即修饰全局变量、函数，告诉编译器当前符号在本模块中没有定义但在别处有定义，编译通过后链接器会找到该符号并正确链接。
>* 语言连接说明。extern "C" {.......}。告诉编译器对当前函数禁止使用C++的函数名修饰。
>* 显式模板实例化声明。 //C++11

在C++11中，他有了新的功能：显式模板实例化声明。
C++模板在使用时才会被实例化，这意味着同一个模板可能在不同模块中被实例化多次——有可能引起代码膨胀，并拖慢编译速度。使用显示模板实例化声明，告诉编译器，该模板不必在当前模块进行实例化，会在链接期间链接其他模块实例化的该模板，如果没有任何模块实例化该模板，则链接失败。这一特性大大加快了大型模板项目的编译过程。

#### 2.8 可变参数模板、sizeof...
可变参数模板应该是那些标准库实现者的福音了，大大增强了模板编程的灵活性。先看下可变参数模板这一神奇特性的使用：
~~~cpp
// Example program
#include <iostream>
#include <string>
template<typename... Ts>
int countArgs(const Ts&... args){
    return sizeof...(args);   
}
template<typename T>
T max(const T& a,const T& b){
    return b > a ? b : a;
}
template<typename T, typename... RestT>
T max(const T& a, const RestT&... restArgs){
    T temp = max(restArgs...);
    return temp > a ? temp : a;
}       
template<typename T>
void func(const T& t){
    std::cout<<t;
}
template<typename T, typename... RestT>
void func(const T& t, const RestT&... restArgs){
    std::cout<<t<<std::endl;
    func(restArgs...);
}
int main(){
    func(1, 'a', "hahah");
    std::cout<<std::endl;
    std::cout<<max(1,5,3,2,8,6,9,7,3)<<std::endl;
    std::cout<<countArgs(1,"g", 0.0009);
}
~~~