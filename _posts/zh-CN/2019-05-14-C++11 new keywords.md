---
layout: post
title: C++11新特性之——新关键字
lang: zh-CN
---

C++11新引入的特性比较多，这里简单记录下每个特性的大致情况，无法将细节一一描述清楚——那样每个特性几乎都要花费一篇博客的篇幅来记录。本文从**新增的关键字** 、 **新增的语义** 、**新增的标准库**三个方面来记录这些新特性。原本打算将这三部分放到一篇博客中，后来发现太长了，还是分开吧。

<!--more--> 

### 0，重点特性概览
个人觉得，auto、统一的初始化（使用“{}”）、右值引用、lambda是C++11里面重量级的四个特性了，auto简化了各种标识符的声明，大括号统一了初始化代码的形式，右值引用作用下的移动语义大大改善了代码性能，lambda表达式则令代码更加简洁，lambda定义在函数体内可以使代码可读性提高很多、封装也更符合日常思维。当然其他特性诸如可变参数模板多线程库等也值得大书特书，但由于个人水平有限，只能将诸多特性做一些浅显的记录，谓之“集锦”。

### 1，新增的关键字
#### 1.1 auto、decltype
事实上，在C++98里已经使用过auto关键字，用来表示一个变量拥有自动的生命周期，但是平时基本用不到，C++11标准就把旧版的这个作用废除了，将auto用作自动类型推断。
auto的引入大大减少了代码的长度——让编译器自己推断标识符的类型而不是人工指定，大多数情况下，编译器是清楚地知道标识符的具体类型的。
~~~cpp
vector<int> arr;
......
vector<int>::iterator it = arr.begin();
auto it2 = arr.begin();//比上面的代码简直爽太多了。
~~~
不过，auto的引入也有小小的不利——牺牲了代码的一部分可读性，例如：
~~~cpp
auto value = myFunction();
~~~
编译器会清楚地知道value的类型，但程序员不一定——除非看一下myFunction的函数声明。但总的来说，利是远远大于弊的。
当我们用一个值或者表达式来初始化一个变量时，可以用auto声明该变量，编译器会自动推断出它的类型，但有些时候，我们不想用一个值或者表达式初始化变量——只想用值的类型来声明一个变量，此时就可以用decltype关键字了,它能够提取变量或者表达式的类型：
~~~cpp
//value的类型是myFunction的返回值的类型，此处并不会真正执行myFunction
decltype(myFunction()) value;
~~~
值得注意的是，decltype推断的结果与表达式的形式密切相关：假如表达式外层有一层或多层小括号，得到的将是引用类型：
~~~cpp
int a = 10;
decltype(a) b; //正确，b的类型是int，b未被初始化。
decltype((a)) c; //错误，c的类型是int&,必须被初始化。
~~~
#### 1.2 =default、=delete、override、final
这几个新增的关键字用与类的设计。=default、=delete两个用于修饰那些编译器会自动生成的函数（例如构造函数与赋值操作符重载函数），=default声明使用编译器生成的，=delete则声明禁止编译器自动生成。例如：
~~~cpp
class Demo{
   public:
    Demo(const int a):m_a{a}{}
   private:
    int m_a;
};
~~~
此时编译器将不再为Demo生成无参构造函数，若想使用编译器自动生成的无参构造函数，可以这样：
~~~cpp
class Demo{
public:
    Demo() =default;
    Demo(const int a):m_a{a}{}
private:
    int m_a;
};
~~~
像下面这样便可禁止Demo2的拷贝构造：
~~~cpp
class Demo2{
public:
    Demo(const Demo& obj) =delete;
private:
    int m_a;
};
~~~
**override** 与 **final**则用于继承控制，override告诉编译器子类要重写父类的虚函数，并确保在子类中声明的override函数跟基类的虚函数有相同的签名，防止了想重写父类虚函数却不小心搞错了参数列表而重写无效的尴尬。final则有两个作用：用来修饰一个类，则这个类不能再被继承；用来修饰一个虚函数，则该虚函数无法被子类重写。
~~~cpp
class FinalBase final{}
class A:public FinalBase{} //错误：FinalBase不能被继承
class B{
public:
	virtual int funcA(int x){}
	virtual int funcB(int x) final{}
}
class C:public B{
	public:
	virtual int funcA(int x) override{...} //Ok, 重写funcA
	virtual int funcB(int x) {...}			//错误：funcB已经被声明为final
}
~~~
#### 1.3 nullprt
引入了nullptr之后，应该摒弃使用NULL或者0来置空一个指针,NULL 与 0本质上都是整型，而不是指针类型。nullptr使类型检查更加严谨。考虑如下代码：
~~~cpp
void f(void*){...}
void f(int){...}
int main(){
    f(NULL);//此调用存在二义性
    f(nullptr);//OK，调用void f(void*)
}
~~~
#### 1.4 constexpr
这个关键字与const非常像，让人傻傻分不清楚。const可用来表示编译期常量也可以用来表示运行期常量，const更侧重于“只读”这个特点。而constexpr则只用来表示编译期常量，告诉编译期可以在编译期计算出该表达式的值，让编译器尽量优化。
~~~cpp
int func(int p){
	const int a = 5;		//a是个编译期常量
	const int b = p;		//b是个运行期常量
	constexpr int c = 6;	//c是个编译期常量
	constexpr int c = p;	//编译报错
	std::array<int, a> arr1;//Ok
	std::array<int, b> arr2;//编译报错
	std::array<int, c> arr3;//Ok
}
~~~
另外，假如一个函数的返回值被constexpr修饰，则编译器会在编译期尽可能计算出函数调用的结果：
~~~cpp
constexpr int calcLength(const int& x){
	return x*5;
}
int calcLength2(const int& x){
	return x*5;
}
int calcLength2(const int& x){
	return x*5;
}
std::array<int, calcLength(2)>  arr10;//OK，arr10是一个10个元素的数组，10这个值在编译期就计算好了，直接替换掉calcLength(2)
std::array<int, calcLength2(3)> arr15;//编译出错calcLength2不是 constexpr
int a{5};
int b = calcLength(a);				  //OK, 调用calcLength(a)返回的不再是一个constexpr，因为a是变量
constexpr c = calcLength(a);		  //编译出错
~~~
另外，这两这个都可以修饰指针，但意义不同。const修饰指针即可用作底层const（修饰指向的内容）又可用作顶层const（修饰指针本身）；而constexpr修饰指针时只修饰指针本身不能修饰指针指向的内容：
~~~cpp
int x = 2;
const int *a;				//a指向一个int常量
int* const b = &x;			//b指向一个int变量，b初始化之后不能更改指向——是个指针常量
constexp int *c = nullptr;	//c是个指针常量——必须在定义时初始化，初始化的值必须在编译期即可确定，且之后不能改变。
~~~
#### 1.5 noexcept
该关键字告诉编译器，函数中不会发生异常,这有利于编译器对程序做更多的优化。